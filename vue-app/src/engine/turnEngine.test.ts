import { describe, expect, it } from 'vitest'
import {
  dockAndRepairTurn,
  endTurn,
  resolvePlayerTurn,
  skipTurns,
  updateLifeSupportCountdown,
} from '@/engine/turnEngine'
import { createNewGameState } from '@/engine/newGame'
import { ENEMY_ENERGY_MAX } from '@/engine/constants'
import type { SectorEntity, Starbase } from '@/types/game'

describe('engine/turnEngine', () => {
  it('endTurn advances stardate by 1 without requiring player action', () => {
    const state = createNewGameState(1)
    const initialStardate = state.stardate
    const res = endTurn(state)
    expect(state.stardate).toBe(initialStardate + 1)
    expect(res.stardate).toBe(initialStardate + 1)
  })

  it('updateLifeSupportCountdown sets countdown to 5 when life support < 40', () => {
    const state = createNewGameState(1)
    state.subsystems.life = 35
    updateLifeSupportCountdown(state)
    expect(state.lifeSupportTurnsRemaining).toBe(5)

    updateLifeSupportCountdown(state)
    expect(state.lifeSupportTurnsRemaining).toBe(4)

    state.subsystems.life = 50
    updateLifeSupportCountdown(state)
    expect(state.lifeSupportTurnsRemaining).toBeNull()
  })

  it('skipTurns stops early when damage is taken', () => {
    const state = createNewGameState(1)
    // Adicionar um inimigo Klingon para causar dano
    const enemy: SectorEntity = {
      id: 'k1',
      type: 'klingon_cruiser',
      position: { row: 5, col: 5 },
      enemyPower: 200,
      enemyEnergy: ENEMY_ENERGY_MAX,
      cloaked: false,
    }
    state.currentSector = [enemy]
    state.shieldEnergy = 100

    const skipRes = skipTurns(state, 5, () => 0.5)
    expect(skipRes.stoppedEarly).toBe(true)
    expect(skipRes.completedTurns).toBe(1)
  })

  it('dockAndRepairTurn redirects enemy attacks to the docked base own hull/shield (starbase-resilience)', () => {
    const state = createNewGameState(1)
    const base: Starbase = {
      id: 'sb1',
      type: 'starbase_dock',
      quadrant: { row: 4, col: 4 },
      sector: { row: 4, col: 4 },
      resourcePool: 500,
      hullIntegrity: 100,
      shieldPoints: 1500,
      torpedoStock: 12,
      torpedoCapacity: 12,
      destroyed: false,
    }
    state.starbases = [base]
    state.docked = true
    state.dockedBaseId = 'sb1'

    const enemy: SectorEntity = {
      id: 'k1',
      type: 'klingon_cruiser',
      position: { row: 5, col: 5 },
      enemyPower: 100,
      enemyEnergy: ENEMY_ENERGY_MAX,
      cloaked: false,
    }
    state.currentSector = [enemy]
    const initialShields = state.shieldEnergy
    // Pool de resupply é moeda de dock(), não vida da base — não deve mudar
    // quando a base absorve dano de combate (`starbase-resilience`).
    const poolBefore = base.resourcePool

    const res = dockAndRepairTurn(state, () => 0.5)
    expect(state.shieldEnergy).toBe(initialShields)
    expect(base.resourcePool).toBe(poolBefore)
    expect(base.shieldPoints).toBeLessThan(1500)
    expect(res.damageTaken).toBe(0)
  })

  it('resolvePlayerTurn runs player action before resolving warp core and enemy turn', () => {
    const state = createNewGameState(1)
    state.phaserPower = 50
    const enemy: SectorEntity = {
      id: 'k1',
      type: 'klingon_cruiser',
      position: { row: 5, col: 5 },
      enemyPower: 10,
      cloaked: false,
    }
    state.currentSector = [enemy]
    // Sem isto `firePhasers` devolve `no_lock` e o turno é RECUSADO. A versão
    // anterior deste teste afirmava `events.some(e => e.includes('Phasers'))` e
    // passava justamente por casar com a string de recusa `"Phasers: no_lock"` —
    // nunca chegou a exercitar a ordem que o nome do teste promete.
    state.weaponsLocked = true
    const res = resolvePlayerTurn(state, { type: 'fire_phasers' }, () => 0.5)
    expect(res.rejected).toBe(false)

    // Afirma sobre o TIPO e a etapa, não sobre o texto.
    const shot = res.events.find((e) => e.type === 'player_phasers')
    expect(shot).toBeDefined()
    expect(shot?.step).toBe(1)
    expect(shot?.entityId).toBe('k1')

    // A ordem que o teste existe pra provar: ação do jogador (etapa 1) resolve
    // antes de qualquer evento de etapa posterior.
    const steps = res.events.map((e) => e.step)
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
  })
})

describe('combat-pressure — revezamento de ataque inimigo', () => {
  const trio = (): SectorEntity[] =>
    (['k1', 'k2', 'k3'] as const).map((id, i) => ({
      id,
      type: 'klingon_cruiser',
      position: { row: 1, col: 1 + i },
      enemyPower: 200,
      enemyEnergy: ENEMY_ENERGY_MAX,
      cloaked: false,
    }))

  it('3 hostis no setor: só 1 ataca por turno, não soma linear', () => {
    // Achado medido na 6ª rodada: 3 inimigos disparando juntos zeravam o
    // escudo (2500) já no turno 1 contra ~6000 de rajada combinada.
    const state = createNewGameState(1)
    state.position.sector = { row: 1, col: 5 }
    state.currentSector = trio()

    const res = endTurn(state, () => 0.5)
    const attacks = res.events.filter((e) => e.type === 'enemy_attack' && e.amount)
    expect(attacks.length).toBe(1)
  })

  it('revezamento cicla entre os 3 hostis ao longo dos turnos', () => {
    const state = createNewGameState(1)
    state.position.sector = { row: 1, col: 5 }
    state.currentSector = trio()

    const attackers = new Set<string>()
    for (let i = 0; i < 3; i++) {
      const res = endTurn(state, () => 0.5)
      const hit = res.events.find((e) => e.type === 'enemy_attack' && e.amount)
      if (hit?.entityId) attackers.add(hit.entityId)
      // Energia plena de novo, pra descartar "sem energia" como causa de não
      // atacar — o que decide é só o revezamento.
      for (const e of state.currentSector) e.enemyEnergy = ENEMY_ENERGY_MAX
    }
    expect(attackers.size).toBe(3)
  })
})

describe('cloak-and-alert — subir de alerta prepara a nave (22.1)', () => {
  it('red alert levanta escudo e liga as armas (se estivessem desligadas)', () => {
    const state = createNewGameState(1)
    state.shieldsRaised = false
    state.subsystemsOn.photons = false
    state.currentSector = [
      {
        id: 'k1',
        type: 'klingon_cruiser',
        position: { row: 1, col: 1 },
        enemyPower: 100,
        enemyEnergy: ENEMY_ENERGY_MAX,
        cloaked: false,
      },
    ]

    endTurn(state, () => 0.5)

    expect(state.alertLevel).toBe('red')
    expect(state.shieldsRaised).toBe(true)
    expect(state.subsystemsOn.photons).toBe(true)
  })

  it('yellow alert só levanta escudo — não liga as armas', () => {
    const state = createNewGameState(1)
    state.position.quadrant = { row: 4, col: 4 }
    state.shieldsRaised = false
    state.subsystemsOn.photons = false
    state.currentSector = [] // sem hostil VISÍVEL no setor atual
    // Vizinhança CONHECIDA com hostil — dígito K > 0 já escaneado antes.
    state.exploredQuadrants['5,4'] = { code: '104', age: 0 }

    endTurn(state, () => 0.5)

    expect(state.alertLevel).toBe('yellow')
    expect(state.shieldsRaised).toBe(true)
    expect(state.subsystemsOn.photons).toBe(false)
  })
})
