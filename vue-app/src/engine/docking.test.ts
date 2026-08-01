import { describe, expect, it } from 'vitest'
import {
  canDock,
  dock,
  undock,
  regenStarbasePools,
} from '@/engine/docking'
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

describe('engine/docking', () => {
  it('canDock returns true when ship is adjacent to an alive starbase', () => {
    const state = fixture()
    state.currentSector = [
      { id: 'b1', type: SectorEntityType.STARBASE_DOCK, position: { row: 4, col: 5 } },
    ]
    expect(canDock(state)).toBe(true)
  })

  it('dock docks ship, resupplies torpedoes/energy, lowers shields and zeroes overload', () => {
    const state = fixture()
    state.currentSector = [
      { id: 'b1', type: SectorEntityType.STARBASE_DOCK, position: { row: 4, col: 5 } },
    ]
    state.starbases = [
      {
        id: 'sb-1',
        type: SectorEntityType.STARBASE_DOCK,
        quadrant: { row: 4, col: 4 },
        sector: { row: 4, col: 5 },
        resourcePool: 500,
        destroyed: false,
      },
    ]
    state.torpedoStock = 0
    state.manualOverload = 10
    state.shieldEnergy = 1000
    state.shieldsRaised = true

    const res = dock(state)
    expect(res.docked).toBe(true)
    expect(state.docked).toBe(true)
    expect(state.torpedoStock).toBeGreaterThan(0)
    expect(state.manualOverload).toBe(0)
    // Emissão desliga, mas a potência ALOCADA fica guardada (shield-power-model).
    expect(state.shieldsRaised).toBe(false)
    expect(state.shieldEnergy).toBe(1000)
  })

  it('undock sets docked to false and clears dockedBaseId', () => {
    const state = {
      docked: true,
      dockedBaseId: 'sb-1',
      position: { quadrant: { row: 1, col: 1 }, sector: { row: 4, col: 4 } },
      currentSector: [],
    }
    undock(state)
    expect(state.docked).toBe(false)
    expect(state.dockedBaseId).toBeNull()
  })

  it('regenStarbasePools regenerates pools of non-active starbases', () => {
    const bases = [
      {
        id: 'sb-1',
        type: SectorEntityType.STARBASE_DOCK,
        quadrant: { row: 1, col: 1 },
        sector: { row: 1, col: 1 },
        resourcePool: 450,
        destroyed: false,
      },
    ]
    regenStarbasePools(bases, 'other-id')
    expect(bases[0].resourcePool).toBe(460)
  })
})
