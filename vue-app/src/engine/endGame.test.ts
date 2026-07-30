import { describe, expect, it } from 'vitest'
import {
  calculateCommanderRating,
  checkTerminalConditions,
  evaluateEndGame,
} from '@/engine/endGame'
import { createNewGameState } from '@/engine/newGame'

describe('engine/endGame', () => {
  it('returns victory when enemiesLeft === 0 and no defeat condition is active', () => {
    const state = createNewGameState(1)
    state.enemiesLeft = 0
    expect(checkTerminalConditions(state)).toBe('victory')
  })

  it('defeat outranks victory: warp core explosion overrides enemiesLeft === 0', () => {
    const state = createNewGameState(1)
    state.enemiesLeft = 0
    expect(checkTerminalConditions(state, { warpCoreExploded: true })).toBe('warp_core_explosion')
  })

  it('crew asphyxiation outranks out_of_energy', () => {
    const state = createNewGameState(1)
    state.lifeSupportTurnsRemaining = 0
    state.subsystems.life = 30
    state.mainEnergy = 0
    expect(checkTerminalConditions(state)).toBe('crew_asphyxiation')
  })

  it('calculateCommanderRating weights captured klingons at 1.5x vs destroyed', () => {
    const stateA = createNewGameState(1)
    stateA.klingonsDestroyed = 2
    stateA.klingonsCaptured = 0

    const stateB = createNewGameState(1)
    stateB.klingonsDestroyed = 0
    stateB.klingonsCaptured = 2

    const ratingA = calculateCommanderRating(stateA)
    const ratingB = calculateCommanderRating(stateB)
    expect(ratingB).toBeGreaterThan(ratingA)
  })

  it('evaluateEndGame sets state.mode to result and populates state.result when terminal', () => {
    const state = createNewGameState(1)
    state.mainEnergy = 0
    const res = evaluateEndGame(state)
    expect(res).not.toBeNull()
    expect(res?.reason).toBe('out_of_energy')
    expect(state.mode).toBe('result')
  })
})
