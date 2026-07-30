import { describe, expect, it } from 'vitest'
import {
  dockAndRepairTurn,
  endTurn,
  resolvePlayerTurn,
  skipTurns,
  updateLifeSupportCountdown,
} from '@/engine/turnEngine'
import { createNewGameState } from '@/engine/newGame'
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
      cloaked: false,
    }
    state.currentSector = [enemy]
    state.shieldEnergy = 100

    const skipRes = skipTurns(state, 5, () => 0.5)
    expect(skipRes.stoppedEarly).toBe(true)
    expect(skipRes.completedTurns).toBe(1)
  })

  it('dockAndRepairTurn redirects enemy attacks to docked base resource pool', () => {
    const state = createNewGameState(1)
    const base: Starbase = {
      id: 'sb1',
      type: 'starbase_dock',
      quadrant: { row: 4, col: 4 },
      sector: { row: 4, col: 4 },
      resourcePool: 500,
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
      cloaked: false,
    }
    state.currentSector = [enemy]
    const initialShields = state.shieldEnergy

    const res = dockAndRepairTurn(state, () => 0.5)
    expect(state.shieldEnergy).toBe(initialShields)
    expect(base.resourcePool).toBeLessThan(500)
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
    const res = resolvePlayerTurn(state, { type: 'fire_phasers' }, () => 0.5)
    expect(res.events.some((e) => e.includes('Phasers'))).toBe(true)
  })
})
