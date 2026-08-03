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

  it('crew asphyxiation outranks no_starbases', () => {
    const state = createNewGameState(1)
    state.lifeSupportTurnsRemaining = 0
    state.subsystems.life = 30
    state.starbases.forEach((b) => (b.destroyed = true))
    expect(checkTerminalConditions(state)).toBe('crew_asphyxiation')
  })

  it('energia esgotada NÃO é condição terminal (é vazão, não estoque)', () => {
    // Sobrecarga e breach substituem o fim de energia: consumir acima do que o
    // Warp Core gera não esvazia tanque, gera dano no core.
    const state = createNewGameState(1)
    state.enemiesLeft = 5
    state.shieldEnergy = 2500
    state.subsystemsOn = { srs: true, lrs: true, photons: true, autoNav: true }
    expect(checkTerminalConditions(state)).toBeNull()
  })

  it('calculateCommanderRating weights captured (1.5x) higher than destroyed', () => {
    const stateA = createNewGameState(1)
    stateA.klingonsDestroyed = 2
    stateA.klingonsCaptured = 0

    const stateB = createNewGameState(1)
    stateB.klingonsDestroyed = 0
    stateB.klingonsCaptured = 2
    stateB.capturedByType = { romulan_warbird: 2 }

    const ratingA = calculateCommanderRating(stateA)
    const ratingB = calculateCommanderRating(stateB)
    expect(ratingB).toBeGreaterThan(ratingA)
  })

  it('captura de Klingon pesa mais que captura de outra espécie (round-6-polish, 20.4)', () => {
    const klingon = createNewGameState(1)
    klingon.capturedByType = { klingon_cruiser: 2 }

    const romulan = createNewGameState(1)
    romulan.capturedByType = { romulan_warbird: 2 }

    expect(calculateCommanderRating(klingon)).toBeGreaterThan(calculateCommanderRating(romulan))
  })

  it('evaluateEndGame sets state.mode to result and populates state.result when terminal', () => {
    const state = createNewGameState(1)
    state.starbases.forEach((b) => (b.destroyed = true))
    const res = evaluateEndGame(state)
    expect(res).not.toBeNull()
    expect(res?.reason).toBe('no_starbases')
    expect(state.mode).toBe('result')
  })
})
