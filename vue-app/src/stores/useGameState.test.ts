/**
 * Testes da store como **fronteira real**: é aqui que o hook `onQuadrantEnter`
 * liga `world-generation` ao `turnEngine`, e aqui que os consoles vão bater.
 *
 * Roda em node — Pinia funciona sem browser via `setActivePinia`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { installIntegrityReseal, useGameState } from '@/stores/useGameState'
import { WARP_CORE_OUTPUT } from '@/engine/constants'

/**
 * Chave de quadrante garantidamente FORA do bloco 3x3 do LRS ao redor da nave.
 *
 * Cravar `'1,1'` (ou `'8,8'`) deixava o teste flaky: `createNewGameState()`
 * sorteia a posição inicial, e quando a nave nascia vizinha da célula cravada o
 * scan renovava a idade que o teste esperava intacta — falhava ~1 em 5 runs.
 */
function farFromShip(quadrant: { row: number; col: number }): string {
  const row = quadrant.row <= 4 ? 8 : 1
  const col = quadrant.col <= 4 ? 8 : 1
  return `${row},${col}`
}

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

    // `toggleRedAlert` foi removida: nenhum console a chamava (o SituationPanel
    // usa `setAlertLevel` pelo setter do computed). `reachability.test.ts` pegou.
    gs.setAlertLevel('red')
    expect(gs.alertLevel).toBe('red')
    gs.setAlertLevel('green')
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

  it('overload manual sobe o Core Output mostrado — o dial não é só risco', () => {
    const gs = useGameState()
    expect(gs.energyProduced).toBe(WARP_CORE_OUTPUT)

    gs.setManualOverload(20)

    expect(gs.energyProduced).toBeCloseTo(WARP_CORE_OUTPUT * 1.2, 5)
    // Orçamento sente o mesmo ganho, consumo intacto.
    expect(gs.energyBudget).toBeCloseTo(WARP_CORE_OUTPUT * 1.2 - gs.subsystemLoad, 5)
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

  it('combat-pressure: carregar tubo é livre, pronto só no turno seguinte', () => {
    const gs = useGameState()
    const stardate = gs.stardate
    const tubeId = gs.tubes[0].id

    const res = gs.loadTube(tubeId)

    expect(res.success).toBe(true)
    expect(gs.stardate).toBe(stardate) // livre — 3 tubos não custam 3 turnos
    expect(gs.tubes[0].loaded).toBe(false) // ainda não: só na resolução seguinte

    gs.executeEndTurn()
    expect(gs.tubes[0].loaded).toBe(true)
  })

  it('escudo: raise/lower liga/desliga emissão sem mexer na potência alocada (shield-power-model)', () => {
    const gs = useGameState()
    const stardate = gs.stardate
    const allocated = gs.shieldEnergy // potência alocada — dial, não o toggle

    gs.lowerShields()
    expect(gs.stardate).toBe(stardate) // livre, não resolve turno
    expect(gs.shieldsRaised).toBe(false)
    expect(gs.shieldEnergy).toBe(allocated) // alocação preservada, só emissão cai
    const budgetDown = gs.energyBudget

    gs.raiseShields()
    expect(gs.shieldsRaised).toBe(true)
    expect(gs.shieldEnergy).toBe(allocated)
    // Erguer liga a emissão de novo — volta a taxar o orçamento.
    expect(gs.energyBudget).toBeLessThan(budgetDown)
  })

  it('newGame SUBSTITUI o mapa explorado — nada vaza da partida anterior', async () => {
    const gs = useGameState()
    // Idade-marcador: a partida nova só cria entrada com `age: 0`, então
    // qualquer 99 sobrevivente é vazamento. Afirmar sobre uma CHAVE cravada
    // ('2,7') deixava o teste flaky — a posição inicial é sorteada, e quando
    // caía naquele quadrante a partida nova criava a entrada legitimamente.
    const VELHO = 99
    gs.$state.exploredQuadrants['2,7'] = { code: '105', age: VELHO }
    gs.$state.lrsScan['2,7'] = { code: '105', age: VELHO }

    await gs.newGame()

    // Com $patch (merge), estas entradas sobreviviam: o Star Chart da partida
    // nova nascia com quadrantes "explorados" da galáxia velha.
    const idades = [
      ...Object.values(gs.exploredQuadrants),
      ...Object.values(gs.lrsScan),
    ].map((e) => e.age)
    expect(idades).not.toContain(VELHO)
  })

  // ── hail-and-identity: identidade da nave ───────────────────────────────

  it('identidade sobrevive a mutação direta do estado (mesma partida)', () => {
    const gs = useGameState()
    gs.setShipIcon('defiant', 'U.S.S. Defiant NX-74205')
    gs.setCaptainName('Sisko')

    expect(gs.shipIconKey).toBe('defiant')
    expect(gs.shipName).toBe('U.S.S. Defiant NX-74205')
    expect(gs.captainName).toBe('Sisko')
  })

  it('New Game volta a identidade aos defaults', async () => {
    const gs = useGameState()
    gs.setShipIcon('defiant', 'U.S.S. Defiant NX-74205')
    gs.setCaptainName('Sisko')

    await gs.newGame()

    expect(gs.shipIconKey).toBe('enterprise-d')
    expect(gs.captainName).toBe('James T. Kirk')
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
    // Conhecimento antigo de um quadrante FORA do bloco 3x3 da nave.
    const longe = farFromShip(gs.position.quadrant)
    gs.$state.lrsScan[longe] = { code: '105', age: 7 }

    gs.scanLongRange()

    // Dado de LRS nunca se perde — só perde confiança. A versão anterior
    // substituía `lrsScan` inteiro pelo bloco novo, apagando o resto do mapa.
    expect(gs.lrsScan[longe]).toBeDefined()
    expect(gs.lrsScan[longe].age).toBe(7) // idade preservada, não renovada
    // E o bloco ao redor da nave entrou, com confiança cheia.
    const here = `${gs.position.quadrant.row},${gs.position.quadrant.col}`
    expect(gs.lrsScan[here]?.age).toBe(0)
  })

  it('rescanear renova a confiança só das células tocadas', () => {
    const gs = useGameState()
    gs.scanLongRange()
    const here = `${gs.position.quadrant.row},${gs.position.quadrant.col}`

    const longe = farFromShip(gs.position.quadrant)
    gs.$state.lrsScan[longe] = { code: '003', age: 5 }
    gs.scanLongRange()

    expect(gs.lrsScan[here].age).toBe(0)
    expect(gs.lrsScan[longe].age).toBe(5)
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

describe('stores/useGameState — selo de integridade', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /** `localStorage` mínimo e isolado por teste. */
  function fakeStorage() {
    const data = new Map<string, string>()
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
      key: () => null,
      length: 0,
    } as Storage
  }

  it('save honesto não liga a infestação', async () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    const gs = useGameState()
    installIntegrityReseal(gs)

    // Um turno resolvido grava o selo sobre o estado atual.
    await gs.executeEndTurn()
    const honesto = JSON.parse(JSON.stringify(gs.$state))

    await gs.checkSaveIntegrity(honesto)
    expect(gs.tribbleInfestationActive).toBe(false)

    vi.unstubAllGlobals()
  })

  it('save adulterado liga a flag, em silêncio', async () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    const gs = useGameState()
    installIntegrityReseal(gs)

    await gs.executeEndTurn()
    const adulterado = JSON.parse(JSON.stringify(gs.$state))
    adulterado.torpedoStock = 999

    const logAntes = gs.combatLog.length
    await gs.checkSaveIntegrity(adulterado)

    expect(gs.tribbleInfestationActive).toBe(true)
    // Punição silenciosa: nada na UI, nada no log.
    expect(gs.combatLog.length).toBe(logAntes)

    vi.unstubAllGlobals()
  })

  it('sem payload gravado não verifica nem regenera a galáxia', async () => {
    const gs = useGameState()
    const galaxiaAntes = JSON.stringify(gs.galaxy)

    await gs.checkSaveIntegrity(null)

    // Sem a guarda, `migrateSave(null, defaults)` patchearia por cima uma
    // galáxia NOVA, gerada aqui só pra servir de default.
    expect(JSON.stringify(gs.galaxy)).toBe(galaxiaAntes)
    expect(gs.tribbleInfestationActive).toBe(false)
  })

  it('save-integrity-fix: ação livre (sem turno) resela o checksum, sem falso positivo', async () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    const gs = useGameState()
    installIntegrityReseal(gs)

    // Bug medido na 6ª rodada: só os 4 caminhos de turno reselavam — uma ação
    // livre como esta deixava o selo desatualizado e a próxima carga acusava
    // jogo normal como adulteração. Nenhum turno é resolvido aqui, de propósito.
    gs.setPhaserPower(80)
    const honesto = JSON.parse(JSON.stringify(gs.$state))

    await gs.checkSaveIntegrity(honesto)
    expect(gs.tribbleInfestationActive).toBe(false)

    vi.unstubAllGlobals()
  })
})
