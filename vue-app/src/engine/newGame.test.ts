import { describe, it, expect } from 'vitest'
import { createNewGameState } from '@/engine/newGame'
import { generateWorld } from '@/engine/worldGen'

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
