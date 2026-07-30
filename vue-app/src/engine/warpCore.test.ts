import { describe, expect, it } from 'vitest'
import {
  autoOverload,
  breachChance,
  effectiveOverload,
  resolveWarpCoreTurn,
  startBreach,
  subsystemDraw,
} from '@/engine/warpCore'
import { createNewGameState } from '@/engine/newGame'

describe('engine/warpCore', () => {
  it('subsystemDraw sums active subsystem energy draws correctly', () => {
    const state = createNewGameState(1)
    const draw = subsystemDraw(state, {})
    expect(draw).toBeGreaterThan(0)
  })

  it('autoOverload returns overload when draw exceeds WARP_CORE_OUTPUT', () => {
    const ol = autoOverload(5000) // 5000 is 500 over 4500 (approx 11%)
    expect(ol).toBeGreaterThan(0)
  })

  it('effectiveOverload combines overload sources and clamps to 0-20', () => {
    const total = effectiveOverload(10, 5, 2)
    expect(total).toBe(17)

    const clamped = effectiveOverload(15, 10, 5)
    expect(clamped).toBe(20)
  })

  it('breachChance calculates chance proportional to warpCore damage fraction', () => {
    const chance = breachChance(0) // 100% damaged -> fraction 1.0 * 0.05 = 0.05
    expect(chance).toBe(0.05)
  })

  it('resolveWarpCoreTurn computes damage and rolls explosion/breach correctly', () => {
    const res = resolveWarpCoreTurn(
      {
        manualOverload: 5,
        autoOverload: 0,
        warpCoreIntegrity: 50,
      },
      () => 0.000001
    )
    expect(res.damage).toBeGreaterThan(0)
    expect(res.exploded).toBe(true)
  })

  it('startBreach creates an active radiation breach with 5 turns remaining', () => {
    const breach = startBreach()
    expect(breach.active).toBe(true)
    expect(breach.turnsRemaining).toBe(5)
    expect(breach.containment).toBe(0)
  })
})
