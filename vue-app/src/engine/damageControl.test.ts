import { describe, expect, it } from 'vitest'
import {
  calculateRepairRate,
  dispatchTeam,
  recallTeam,
  resolveBreachTurn,
  resolveDamageControlTurn,
  resolveLandingPartyTurn,
  sendParty,
  syncBrigGuard,
} from '@/engine/damageControl'
import { createNewGameState } from '@/engine/newGame'
import { SectorEntityType } from '@/types/game'


/**
 * Estado de teste com posição da nave FIXA em quadrante/setor 4,4 e setor limpo. Necessário
 * porque `createNewGameState` agora sorteia a posição inicial e povoa o setor
 * (world-generation) — fixtures que assumiam 4,4 e setor vazio quebravam.
 */
function fixture(seed = 1) {
  const state = createNewGameState(seed)
  state.position = { quadrant: { row: 4, col: 4 }, sector: { row: 4, col: 4 } }
  state.currentSector = []
  return state
}

describe('engine/damageControl', () => {
  it('syncBrigGuard locks 1 team in guard when prisoners are held and frees when brig is empty', () => {
    const state = fixture()
    state.brig.count = 2
    syncBrigGuard(state)
    const guardTeams = state.teams.filter((t) => t.status === 'guard')
    expect(guardTeams.length).toBe(1)

    state.brig.count = 0
    syncBrigGuard(state)
    const afterFree = state.teams.filter((t) => t.status === 'guard')
    expect(afterFree.length).toBe(0)
  })

  it('dispatchTeam assigns an idle team without consuming a turn', () => {
    const state = fixture()
    const team = state.teams[0]
    const res = dispatchTeam(state, team.id, 'phasers')
    expect(res.success).toBe(true)
    expect(team.status).toBe('working')
    expect(team.assignedSystem).toBe('phasers')
  })

  it('recallTeam places an exhausted team into cooldown', () => {
    const state = fixture()
    const team = state.teams[0]
    team.status = 'working'
    team.efficiency = 20
    const res = recallTeam(state, team.id)
    expect(res.success).toBe(true)
    expect(team.status).toBe('cooldown')
  })

  it('calculateRepairRate applies diminishing returns for stacked teams', () => {
    const state = fixture()
    // `turnsWorked: 1` = equipe já trabalhava antes deste turno. Com 0 ela não
    // contribui: reparo começa no turno SEGUINTE ao despacho.
    state.teams[0].status = 'working'
    state.teams[0].assignedSystem = 'shields'
    state.teams[0].efficiency = 100
    state.teams[0].turnsWorked = 1

    state.teams[1].status = 'working'
    state.teams[1].assignedSystem = 'shields'
    state.teams[1].efficiency = 100
    state.teams[1].turnsWorked = 1

    // 2 teams at 100%: 5 * tier3 * (1 * 1 + 1 * 1) = 15 * 2 = 30
    const rate = calculateRepairRate(state, 'shields')
    expect(rate).toBe(30)
  })

  it('não repara no turno do despacho, repara no seguinte', () => {
    const state = fixture()
    state.subsystems.warp = 80
    dispatchTeam(state, state.teams[0].id, 'warp')

    // Turno N (o do despacho): equipe entra com turnsWorked 0, nenhum reparo.
    const turnN = resolveDamageControlTurn(state)
    expect(turnN.repairs['warp']).toBe(0)
    expect(state.subsystems.warp).toBe(80)
    expect(state.teams[0].turnsWorked).toBe(1)

    // Turno N+1: agora conta. Eficiência já caiu pela fadiga do turno N
    // (100 * 0.5^(1/3) = 79), então 5 * 3 * 0.79 = 11.85 -> 12.
    const turnNext = resolveDamageControlTurn(state)
    expect(turnNext.repairs['warp']).toBeGreaterThan(0)
    expect(state.subsystems.warp).toBeGreaterThan(80)
  })

  it('resolveDamageControlTurn repairs damaged subsystems and updates team efficiency', () => {
    const state = fixture()
    state.subsystems.warp = 80
    state.teams[0].status = 'working'
    state.teams[0].assignedSystem = 'warp'
    state.teams[0].efficiency = 100
    state.teams[0].turnsWorked = 1

    const res = resolveDamageControlTurn(state)
    expect(res.repairs['warp']).toBe(15) // 5 * 3 * 1.0 = 15
    expect(state.subsystems.warp).toBe(95)
    expect(state.teams[0].turnsWorked).toBe(2)
  })

  it('breach expira sem contenção e sinaliza morte por radiação', () => {
    const state = fixture()
    state.breach = { active: true, containment: 0, turnsRemaining: 1 }

    const res = resolveBreachTurn(state)
    expect(res.expired).toBe(true)
    expect(res.contained).toBe(false)
    expect(state.breach.turnsRemaining).toBe(0)
  })

  it('breach com equipe designada progride a contenção em tier 5', () => {
    const state = fixture()
    state.breach = { active: true, containment: 0, turnsRemaining: 5 }
    state.teams[0].status = 'working'
    state.teams[0].assignedSystem = 'warpCore'
    state.teams[0].efficiency = 100
    state.teams[0].turnsWorked = 1

    const res = resolveBreachTurn(state)
    // tier 5 durante breach: 5 * 5 * 1.0 = 25
    expect(res.containmentGained).toBe(25)
    expect(state.breach.containment).toBe(25)
    expect(state.breach.active).toBe(true)
  })

  /** Planta um planeta adjacente com as cargas dadas e despacha a missão. */
  const mine = (charges: number) => {
    const state = fixture()
    state.currentSector = [
      {
        id: 'p1',
        type: SectorEntityType.PLANET,
        position: { row: 4, col: 5 },
        dilithiumCharges: charges,
        surveyed: false,
      },
    ]
    const res = sendParty(state, state.teams[0].id, { row: 4, col: 5 })
    // rng 0.9 fica acima de qualquer risco: isola o efeito das cargas.
    resolveLandingPartyTurn(state, () => 0.9)
    resolveLandingPartyTurn(state, () => 0.9)
    const final = resolveLandingPartyTurn(state, () => 0.9)
    return { state, res, final, planet: state.currentSector[0] }
  }

  it('missão dura 3 turnos e devolve a equipe ao pool', () => {
    const state = fixture()
    state.currentSector = [
      { id: 'p1', type: SectorEntityType.PLANET, position: { row: 4, col: 5 } },
    ]
    const res = sendParty(state, state.teams[0].id, { row: 4, col: 5 })
    expect(res.success).toBe(true)
    expect(state.teams[0].status).toBe('away')
    expect(state.landingParty?.turnsRemaining).toBe(3)

    resolveLandingPartyTurn(state, () => 0.9)
    resolveLandingPartyTurn(state, () => 0.9)
    expect(resolveLandingPartyTurn(state, () => 0.9).completed).toBe(true)
    expect(state.landingParty).toBeNull()
    expect(state.teams[0].status).toBe('idle')
  })

  it('planeta com carga rende +30 e consome exatamente 1 carga', () => {
    const { final, planet, state } = mine(2)
    expect(final.boost).toBe(30)
    expect(planet.dilithiumCharges).toBe(1)
    expect(state.subsystems.warpCore).toBe(100) // já estava cheio, clampa
  })

  it('planeta ESTÉRIL gasta os turnos e não rende nada', () => {
    // O dilema: 70% dos planetas não têm nada, e o jogador não sabia antes de ir
    // (world-generation design.md decisão 7).
    const { final, state } = mine(0)
    expect(final.completed).toBe(true)
    expect(final.destroyed).toBe(false)
    expect(final.boost).toBe(0)
    expect(state.landingParty).toBeNull()
  })

  it('missão revela o planeta, mesmo estéril', () => {
    expect(mine(0).planet.surveyed).toBe(true)
    expect(mine(3).planet.surveyed).toBe(true)
  })

  it('planeta rico suporta missões repetidas até esgotar', () => {
    const { state, planet } = mine(3)
    expect(planet.dilithiumCharges).toBe(2)

    state.subsystems.warpCore = 10
    for (const esperado of [1, 0]) {
      sendParty(state, state.teams[1].id, { row: 4, col: 5 })
      resolveLandingPartyTurn(state, () => 0.9)
      resolveLandingPartyTurn(state, () => 0.9)
      expect(resolveLandingPartyTurn(state, () => 0.9).boost).toBe(30)
      expect(planet.dilithiumCharges).toBe(esperado)
    }
    // Esgotado: próxima missão não rende mais.
    sendParty(state, state.teams[2].id, { row: 4, col: 5 })
    resolveLandingPartyTurn(state, () => 0.9)
    resolveLandingPartyTurn(state, () => 0.9)
    expect(resolveLandingPartyTurn(state, () => 0.9).boost).toBe(0)
  })

  // ── hail-and-identity: base científica acelera o descanso ──────────────────

  it('atracado recupera fadiga no DOBRO do idle normal', () => {
    const state = fixture()
    state.teams[0].status = 'idle'
    state.teams[0].efficiency = 50
    state.docked = false
    state.dockedBaseId = null

    resolveDamageControlTurn(state)
    expect(state.teams[0].efficiency).toBe(58) // +8, taxa normal

    state.teams[0].efficiency = 50
    state.docked = true
    state.dockedBaseId = 'base-dock'
    state.starbases = [
      {
        id: 'base-dock',
        type: SectorEntityType.STARBASE_DOCK,
        quadrant: { row: 4, col: 4 },
        sector: { row: 4, col: 4 },
        resourcePool: 500,
        destroyed: false,
      },
    ]

    resolveDamageControlTurn(state)
    expect(state.teams[0].efficiency).toBe(66) // +16, dobro do idle
  })

  it('base científica recupera mais rápido que uma doca', () => {
    const mesmasEquipes = () => {
      const state = fixture()
      state.teams[0].status = 'cooldown'
      state.teams[0].efficiency = 20
      state.docked = true
      return state
    }

    const doca = mesmasEquipes()
    doca.dockedBaseId = 'b-dock'
    doca.starbases = [
      {
        id: 'b-dock',
        type: SectorEntityType.STARBASE_DOCK,
        quadrant: { row: 4, col: 4 },
        sector: { row: 4, col: 4 },
        resourcePool: 500,
        destroyed: false,
      },
    ]

    const cientifica = mesmasEquipes()
    cientifica.dockedBaseId = 'b-sci'
    cientifica.starbases = [
      {
        id: 'b-sci',
        type: SectorEntityType.STARBASE_SCIENCE,
        quadrant: { row: 4, col: 4 },
        sector: { row: 4, col: 4 },
        resourcePool: 500,
        destroyed: false,
      },
    ]

    resolveDamageControlTurn(doca)
    resolveDamageControlTurn(cientifica)

    expect(cientifica.teams[0].efficiency).toBeGreaterThan(doca.teams[0].efficiency)
  })

  it('base científica segue sem repor torpedo nem casco (docking já cobre isto, confirma aqui o eixo de recuperação)', () => {
    // A ausência de resupply é comportamento de `docking.ts`; este teste só
    // confirma que o ganho de EFICIÊNCIA das equipes não é acompanhado de
    // nenhum reparo de subsistema fora do que `calculateRepairRate` já dava.
    const state = fixture()
    state.docked = true
    state.dockedBaseId = 'b-sci'
    state.starbases = [
      {
        id: 'b-sci',
        type: SectorEntityType.STARBASE_SCIENCE,
        quadrant: { row: 4, col: 4 },
        sector: { row: 4, col: 4 },
        resourcePool: 500,
        destroyed: false,
      },
    ]
    state.teams[0].status = 'idle'
    const before = { ...state.subsystems }
    resolveDamageControlTurn(state)
    // Nenhuma equipe estava 'working': nenhum subsistema deveria ganhar reparo.
    expect(state.subsystems).toEqual(before)
  })
})
