import { describe, it, expect } from 'vitest'
import { createNewGameState } from '@/engine/newGame'
import { generateWorld } from '@/engine/worldGen'
import {
  TORPEDO_STOCK_INITIAL_MAX,
  TORPEDO_STOCK_INITIAL_MIN,
  TORPEDO_STOCK_MAX,
} from '@/engine/constants'

describe('semente persistida', () => {
  it('estado guarda a semente e ela regenera a mesma galáxia', () => {
    const s = createNewGameState()
    expect(typeof s.seed).toBe('number')
    // Simula reload: só a semente sobreviveu -> regenera identico.
    expect(generateWorld(s.seed).galaxy).toEqual(s.galaxy)
  })
  it('serializa e volta igual (round-trip de persistência)', () => {
    const s = createNewGameState(4242)
    const back = JSON.parse(JSON.stringify(s))
    expect(back.seed).toBe(4242)
    expect(back.galaxy).toEqual(s.galaxy)
  })
})

describe('estoque inicial de torpedo', () => {
  it('sorteia entre MIN e MAX (7-9), nunca cravado, e sempre <= TORPEDO_STOCK_MAX', () => {
    const rolls = new Set<number>()
    for (let seed = 0; seed < 200; seed++) {
      const s = createNewGameState(seed)
      expect(s.torpedoStock).toBeGreaterThanOrEqual(TORPEDO_STOCK_INITIAL_MIN)
      expect(s.torpedoStock).toBeLessThanOrEqual(TORPEDO_STOCK_INITIAL_MAX)
      expect(s.torpedoStock).toBeLessThanOrEqual(TORPEDO_STOCK_MAX)
      rolls.add(s.torpedoStock)
    }
    expect(rolls.size).toBeGreaterThan(1)
  })

  it('mesma semente sempre sorteia o mesmo estoque', () => {
    expect(createNewGameState(4242).torpedoStock).toBe(
      createNewGameState(4242).torpedoStock,
    )
  })
})
