/**
 * Testes da store como **fronteira real**: é aqui que o hook `onQuadrantEnter`
 * liga `world-generation` ao `turnEngine`, e aqui que os consoles vão bater.
 *
 * Roda em node — Pinia funciona sem browser via `setActivePinia`.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameState } from '@/stores/useGameState'
import { WARP_CORE_OUTPUT } from '@/engine/constants'

describe('stores/useGameState', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('povoa currentSector ao trocar de quadrante (hook onQuadrantEnter ligado)', async () => {
    const gs = useGameState()
    gs.$state.warpFactor = 8
    const origem = { ...gs.position.quadrant }

    // Escolhe um vizinho dentro do grid, distância 1 -> chega em 1 turno a warp 8.
    const destino = {
      row: origem.row < 8 ? origem.row + 1 : origem.row - 1,
      col: origem.col,
    }

    await gs.moveWarp(destino)

    expect(gs.position.quadrant).toEqual(destino)
    // O setor tem que ter sido materializado: toda célula da galáxia tem >= 1
    // estrela, então setor vazio aqui significa hook desligado.
    expect(gs.currentSector.length).toBeGreaterThan(0)
  })

  it('nave nunca fica em cima de entidade depois de materializar o setor', async () => {
    const gs = useGameState()
    gs.$state.warpFactor = 8
    const origem = { ...gs.position.quadrant }
    const destino = {
      row: origem.row < 8 ? origem.row + 1 : origem.row - 1,
      col: origem.col,
    }

    await gs.moveWarp(destino)

    const shipCell = `${gs.position.sector.row},${gs.position.sector.col}`
    const occupied = gs.currentSector.map(
      (e) => `${e.position.row},${e.position.col}`,
    )
    expect(occupied).not.toContain(shipCell)
  })

  it('eventos do turno entram no combat log', async () => {
    const gs = useGameState()
    expect(gs.combatLog.length).toBe(0)

    await gs.executeEndTurn()

    // Um turno vazio pode não gerar evento; um turno com ação gera.
    await gs.launchProbe({ row: 1, col: 1 })
    expect(gs.combatLog.length).toBeGreaterThan(0)
    expect(gs.combatLog[gs.combatLog.length - 1].stardate).toBe(gs.stardate)
  })

  it('ação recusada não consome turno nem stardate', async () => {
    const gs = useGameState()
    gs.$state.remainingProbes = 0
    const stardate = gs.stardate

    const res = await gs.launchProbe({ row: 1, col: 1 })

    expect(res.rejected).toBe(true)
    expect(gs.stardate).toBe(stardate)
  })

  it('alertLevel alterna red/green e aceita yellow como estado válido', () => {
    const gs = useGameState()
    expect(gs.alertLevel).toBe('green')

    gs.toggleRedAlert()
    expect(gs.alertLevel).toBe('red')
    gs.toggleRedAlert()
    expect(gs.alertLevel).toBe('green')

    // Yellow é representável e legível, só não tem tema próprio.
    gs.setAlertLevel('yellow')
    expect(gs.alertLevel).toBe('yellow')
  })

  it('energyBudget é gerada menos consumida, e reage ao consumo', () => {
    const gs = useGameState()
    expect(gs.energyBudget).toBe(WARP_CORE_OUTPUT - gs.subsystemLoad)

    // Ligar um sensor tem que reduzir a sobra. Se o widget lesse `mainEnergy`
    // (o estoque), este número não se moveria — foi o bug do playthrough.
    const before = gs.energyBudget
    gs.$state.subsystemsOn.lrs = true
    gs.$state.subsystemsOn.srs = true
    gs.$state.shieldEnergy = 2000
    expect(gs.energyBudget).toBeLessThan(before)
  })

  it('orçamento fica negativo quando o consumo passa do output do WC', () => {
    const gs = useGameState()
    // Escudo no teto + tudo ligado empurra o consumo além dos 4500.
    gs.$state.shieldEnergy = 2500
    gs.$state.impulsePower = 100
    gs.$state.phaserPower = 100
    for (const tube of gs.$state.tubes) tube.loaded = true
    gs.$state.subsystemsOn = { srs: true, lrs: true, photons: true, autoNav: true }

    // Não afirmo o sinal (depende do balanceamento): afirmo que orçamento e
    // sobrecarga automática concordam. Discordar seria o bug.
    if (gs.energyBudget < 0) {
      expect(gs.subsystemLoad).toBeGreaterThan(WARP_CORE_OUTPUT)
    } else {
      expect(gs.subsystemLoad).toBeLessThanOrEqual(WARP_CORE_OUTPUT)
    }
  })

  it('output do core cai com o dano, apertando o orçamento sem mudar o consumo', () => {
    const gs = useGameState()
    const drawBefore = gs.subsystemLoad
    const budgetBefore = gs.energyBudget

    // Espiral: core danificado gera menos, o MESMO consumo passa a caber pior.
    gs.$state.subsystems.warpCore = 50
    expect(gs.subsystemLoad).toBe(drawBefore)
    expect(gs.energyProduced).toBeLessThan(WARP_CORE_OUTPUT)
    expect(gs.energyBudget).toBeLessThan(budgetBefore)
  })

  it('não existe condição terminal de energia', async () => {
    const gs = useGameState()
    // Consumo alto por muitos turnos não mata por esgotamento — o risco é
    // sobrecarga danificando o core.
    gs.$state.shieldEnergy = 2500
    gs.$state.subsystemsOn = { srs: true, lrs: true, photons: true, autoNav: true }
    const res = await gs.executeSkipTurns(5)
    expect(res.lastResult.terminalReason).not.toBe('out_of_energy')
  })

  it('subsystemLoad é o consumo real, não um mock', () => {
    const gs = useGameState()
    const base = gs.subsystemLoad
    expect(base).toBeGreaterThan(0)
    expect(base).toBeLessThan(WARP_CORE_OUTPUT)

    // Ligar um sensor tem que mexer no número — se for mock, não mexe.
    gs.$state.subsystemsOn.lrs = !gs.$state.subsystemsOn.lrs
    expect(gs.subsystemLoad).not.toBe(base)
  })

  it('despacho de equipe é livre: não resolve turno', () => {
    const gs = useGameState()
    const stardate = gs.stardate

    const res = gs.dispatchTeam(gs.teams[0].id, 'warp')

    expect(res.success).toBe(true)
    expect(gs.stardate).toBe(stardate)
  })

  it('escudo é nível livre: sem pool de origem, e taxa o orçamento enquanto erguido', () => {
    const gs = useGameState()
    const stardate = gs.stardate

    gs.raiseShields()
    expect(gs.stardate).toBe(stardate) // livre, não resolve turno
    expect(gs.shieldEnergy).toBe(2500) // chega ao teto SEM depender de estoque
    const budgetUp = gs.energyBudget

    gs.lowerShields()
    expect(gs.shieldEnergy).toBe(0)
    // Baixar o escudo libera a vazão que ele consumia.
    expect(gs.energyBudget).toBeGreaterThan(budgetUp)
  })

  it('newGame SUBSTITUI o mapa explorado — nada vaza da partida anterior', async () => {
    const gs = useGameState()
    // Simula conhecimento acumulado numa partida.
    gs.$state.exploredQuadrants['2,7'] = { code: '105', age: 3 }
    gs.$state.lrsScan['2,7'] = { code: '105', age: 3 }

    await gs.newGame()

    // Com $patch (merge), estas chaves sobreviviam: o Star Chart da partida
    // nova nascia com quadrantes "explorados" da galáxia velha.
    expect(gs.exploredQuadrants['2,7']).toBeUndefined()
    expect(Object.keys(gs.lrsScan)).toHaveLength(0)
  })

  it('Snd Helm só informa o destino — mover é o Engage', () => {
    const gs = useGameState()
    const posBefore = { ...gs.position.sector }
    const stardate = gs.stardate

    gs.setDestinationSector({ row: 2, col: 6 })

    expect(gs.destinationSector).toEqual({ row: 2, col: 6 })
    expect(gs.position.sector).toEqual(posBefore) // não moveu
    expect(gs.stardate).toBe(stardate) // não gastou turno
  })

  it('Engage Impulse usa o destino de setor e a potência decide a velocidade', async () => {
    const gs = useGameState()
    gs.$state.currentSector = []
    gs.$state.position.sector = { row: 1, col: 1 }
    gs.setDestinationSector({ row: 1, col: 8 }) // distância 7

    // Dial a 25%: 2 células/turno — 1 engage NÃO chega.
    gs.$state.impulsePower = 25
    await gs.moveImpulse()
    expect(gs.position.sector).toEqual({ row: 1, col: 3 })

    // Dial a 100%: 8 células/turno — cruza o resto de uma vez.
    gs.$state.impulsePower = 100
    await gs.moveImpulse()
    expect(gs.position.sector).toEqual({ row: 1, col: 8 })
  })

  it('sonda alimenta o LRS via datalink, além do Star Chart', async () => {
    const gs = useGameState()
    gs.$state.currentSector = []
    const target = { row: 1, col: 1 }
    // Alvo SEM inimigo: com Klingon lá, o roll de destruição (40% + 5%/extra)
    // mata a sonda e ela não revela nada — o que deixava este teste flaky,
    // já que a semente do New Game é aleatória a cada execução.
    gs.$state.galaxy['1,1'].klingons = 0
    await gs.launchProbe(target)

    // distância + 1 turnos até resolver
    for (let i = 0; i < 9 && gs.probe; i++) await gs.executeEndTurn()

    expect(gs.exploredQuadrants['1,1']).toBeDefined()
    expect(gs.lrsScan['1,1']).toBeDefined() // o datalink
  })

  it('scan de LRS MESCLA, não apaga o que já era conhecido', () => {
    const gs = useGameState()
    // Conhecimento antigo de um quadrante longe do bloco 3x3 atual.
    gs.$state.lrsScan['1,1'] = { code: '105', age: 7 }

    gs.scanLongRange()

    // Dado de LRS nunca se perde — só perde confiança. A versão anterior
    // substituía `lrsScan` inteiro pelo bloco novo, apagando o resto do mapa.
    expect(gs.lrsScan['1,1']).toBeDefined()
    expect(gs.lrsScan['1,1'].age).toBe(7) // idade preservada, não renovada
    // E o bloco ao redor da nave entrou, com confiança cheia.
    const here = `${gs.position.quadrant.row},${gs.position.quadrant.col}`
    expect(gs.lrsScan[here]?.age).toBe(0)
  })

  it('rescanear renova a confiança só das células tocadas', () => {
    const gs = useGameState()
    gs.scanLongRange()
    const here = `${gs.position.quadrant.row},${gs.position.quadrant.col}`

    gs.$state.lrsScan['8,8'] = { code: '003', age: 5 }
    gs.scanLongRange()

    expect(gs.lrsScan[here].age).toBe(0)
    expect(gs.lrsScan['8,8'].age).toBe(5)
  })

  it('marcador de leitura do log zera o não-lido da categoria', async () => {
    const gs = useGameState()
    await gs.launchProbe({ row: 1, col: 1 })

    const category = gs.combatLog[0].category
    expect(gs.unreadByCategory[category]).toBeGreaterThan(0)

    gs.markLogRead(category)
    expect(gs.unreadByCategory[category]).toBe(0)
  })
})
