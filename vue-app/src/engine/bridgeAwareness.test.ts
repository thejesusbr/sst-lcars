/**
 * `bridge-awareness`: alerta automático (10.0), ação Survey (13.4) e a
 * categorização science/captain (15.9). O mostrador T-n e o Alert 10 são
 * lógica de estado pura testada aqui; o resto (T-n renderizado, som
 * efetivamente tocando) é UI sem teste de componente neste projeto — cabe ao
 * Storybook e ao playthrough.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { endTurn, resolvePlayerTurn } from '@/engine/turnEngine'
import { ENEMY_ENERGY_MAX } from '@/engine/constants'
import { createNewGameState } from '@/engine/newGame'
import { SectorEntityType, type SectorEntity } from '@/types/game'

const playSound = vi.fn()
vi.mock('@/composables/useSound', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/useSound')>()
  return { ...actual, useSound: () => ({ playSound }) }
})
// O import da store precisa vir DEPOIS do mock acima (hoisted pelo vitest,
// mas mantém a ordem de leitura clara com o resto do arquivo).
const { useGameState } = await import('@/stores/useGameState')

const klingon = (row: number, col: number): SectorEntity => ({
  id: 'k1',
  type: SectorEntityType.KLINGON_CRUISER,
  position: { row, col },
  enemyPower: 300,
  enemyShield: 0,
  enemyEnergy: ENEMY_ENERGY_MAX,
})

describe('bridge-awareness — alerta automático (item 10.0)', () => {
  it('hostil visível no setor sobe pra red, sozinho', () => {
    const state = createNewGameState(1)
    state.currentSector = [klingon(2, 2)]
    expect(state.alertLevel).toBe('green')

    endTurn(state, () => 0.99)

    expect(state.alertLevel).toBe('red')
  })

  it('hostil CONHECIDO na vizinhança, nenhum no setor, sobe pra yellow', () => {
    const state = createNewGameState(1)
    state.currentSector = []
    const q = state.position.quadrant
    const neighbor = { row: q.row, col: q.col + 1 }
    // "Conhecido" = já explorado com o dígito K > 0.
    state.exploredQuadrants[`${neighbor.row},${neighbor.col}`] = {
      code: '204',
      age: 0,
    }

    endTurn(state, () => 0.99)

    expect(state.alertLevel).toBe('yellow')
  })

  it('limpar o setor NÃO baixa o alerta — descida é só do jogador', () => {
    const state = createNewGameState(1)
    state.currentSector = [klingon(2, 2)]
    endTurn(state, () => 0.99)
    expect(state.alertLevel).toBe('red')

    state.currentSector = []
    endTurn(state, () => 0.99)

    expect(state.alertLevel).toBe('red')
  })

  it('sem hostil visível nem conhecido, o alerta fica onde o jogador deixou', () => {
    const state = createNewGameState(1)
    state.currentSector = []
    endTurn(state, () => 0.99)
    expect(state.alertLevel).toBe('green')
  })
})

describe('bridge-awareness — ação Survey (item 13.4)', () => {
  const planeta = (charges: number): SectorEntity => ({
    id: 'p1',
    type: SectorEntityType.PLANET,
    position: { row: 3, col: 3 },
    dilithiumCharges: charges,
    surveyed: false,
  })

  it('SRS íntegro sempre reporta certo', () => {
    const comCarga = createNewGameState(1)
    comCarga.subsystems.srs = 100
    comCarga.currentSector = [planeta(2)]
    const res1 = resolvePlayerTurn(comCarga, { type: 'survey' }, () => 0.01)
    expect(res1.rejected).toBe(false)
    expect(res1.events[0].text).toContain('depósito de dilítio')

    const semCarga = createNewGameState(2)
    semCarga.subsystems.srs = 100
    semCarga.currentSector = [planeta(0)]
    const res2 = resolvePlayerTurn(semCarga, { type: 'survey' }, () => 0.01)
    expect(res2.events[0].text).toContain('nenhum traço de dilítio')
  })

  it('survey NÃO revela quantidade nem consome carga', () => {
    const state = createNewGameState(1)
    state.subsystems.srs = 100
    state.currentSector = [planeta(2)]
    resolvePlayerTurn(state, { type: 'survey' }, () => 0.01)

    const planet = state.currentSector[0]
    expect(planet.dilithiumCharges).toBe(2)
    expect(planet.surveyed).toBe(false)
  })

  it('SRS em crítico rejeita, sem gastar turno', () => {
    const state = createNewGameState(1)
    state.subsystems.srs = 30 // d=0.7, crítico
    state.currentSector = [planeta(2)]
    const stardate = state.stardate

    const res = resolvePlayerTurn(state, { type: 'survey' }, () => 0.01)

    expect(res.rejected).toBe(true)
    expect(state.stardate).toBe(stardate)
  })

  it('sem planeta no setor, rejeita', () => {
    const state = createNewGameState(1)
    state.currentSector = []
    const res = resolvePlayerTurn(state, { type: 'survey' }, () => 0.01)
    expect(res.rejected).toBe(true)
  })

  it('SRS moderado pode mentir — mesma curva de degradedChance do resto do jogo', () => {
    const state = createNewGameState(1)
    state.subsystems.srs = 55 // d=0.45, moderado (degradedChance = 0.15)
    state.currentSector = [planeta(2)] // tem carga de verdade

    // rng abaixo do limiar de erro: reporta ERRADO (sem dilítio).
    const mentiu = resolvePlayerTurn(state, { type: 'survey' }, () => 0.1)
    expect(mentiu.events[0].text).toContain('nenhum traço de dilítio')

    // rng acima do limiar: reporta certo.
    const state2 = createNewGameState(1)
    state2.subsystems.srs = 55
    state2.currentSector = [planeta(2)]
    const certo = resolvePlayerTurn(state2, { type: 'survey' }, () => 0.9)
    expect(certo.events[0].text).toContain('depósito de dilítio')
  })

  it('planeta intacto após reparar o SRS volta a reportar certo (nunca corrompe o estado)', () => {
    const state = createNewGameState(1)
    state.subsystems.srs = 55
    state.currentSector = [planeta(2)]
    resolvePlayerTurn(state, { type: 'survey' }, () => 0.1) // mentiu, mas...
    expect(state.currentSector[0].dilithiumCharges).toBe(2) // ...estado intacto

    state.subsystems.srs = 100 // "repara"
    const res = resolvePlayerTurn(state, { type: 'survey' }, () => 0.01)
    expect(res.events[0].text).toContain('depósito de dilítio')
  })
})

describe('bridge-awareness — categoria science vs captain (item 15.9)', () => {
  it('lançar sonda cai em captain; o relatório ao chegar cai em science', () => {
    const state = createNewGameState(1)
    const launch = resolvePlayerTurn(
      state,
      { type: 'launch_probe', targetCoord: { row: 1, col: 1 } },
      () => 0.5,
    )
    expect(launch.events.find((e) => e.type === 'probe')).toBeDefined()
    expect(launch.events.some((e) => e.type === 'probe_report')).toBe(false)
  })

  it('despachar a party cai em captain; o achado ao voltar cai em landing_party_report', () => {
    const state = createNewGameState(1)
    state.position.sector = { row: 5, col: 5 }
    state.currentSector = [
      { id: 'pl1', type: SectorEntityType.PLANET, position: { row: 5, col: 5 } },
    ]
    const team = state.teams[0]
    const dispatch = resolvePlayerTurn(
      state,
      { type: 'send_party', teamId: team.id, targetCoord: { row: 5, col: 5 } },
      () => 0.99,
    )
    expect(dispatch.events.find((e) => e.type === 'landing_party')).toBeDefined()
    expect(
      dispatch.events.some((e) => e.type === 'landing_party_report'),
    ).toBe(false)
  })
})

describe('bridge-awareness — Alert 10 (item 11.5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    playSound.mockClear()
  })

  it('WC crítico sem equipe working soa; equipe working nele silencia', () => {
    const gs = useGameState()
    gs.$state.subsystems.warpCore = 30 // crítico (< CRITICAL_INTEGRITY)

    gs.checkTerminalAlarms()
    expect(playSound).toHaveBeenCalledTimes(1)

    playSound.mockClear()
    const team = gs.$state.teams[0]
    team.assignedSystem = 'warpCore'
    team.status = 'working'
    gs.checkTerminalAlarms()
    expect(playSound).not.toHaveBeenCalled()
  })

  it('equipe designada mas em cooldown NÃO silencia — só "working" conta', () => {
    const gs = useGameState()
    gs.$state.subsystems.life = 30
    const team = gs.$state.teams[0]
    team.assignedSystem = 'life'
    team.status = 'cooldown'

    gs.checkTerminalAlarms()

    expect(playSound).toHaveBeenCalledTimes(1)
  })

  it('Hull soa 1x ao cruzar pra crítico e rearma só depois de recuperar', () => {
    const gs = useGameState()
    gs.$state.hullIntegrity = 30

    gs.checkTerminalAlarms()
    expect(playSound).toHaveBeenCalledTimes(1)

    playSound.mockClear()
    gs.checkTerminalAlarms() // ainda crítico, já armado — não repete
    expect(playSound).not.toHaveBeenCalled()

    gs.$state.hullIntegrity = 100 // recupera
    gs.checkTerminalAlarms()
    expect(playSound).not.toHaveBeenCalled()

    gs.$state.hullIntegrity = 25 // cruza de novo — rearmou
    gs.checkTerminalAlarms()
    expect(playSound).toHaveBeenCalledTimes(1)
  })
})
