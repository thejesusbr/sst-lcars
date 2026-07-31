/**
 * A nave atracada não é desenhada no setor — ela está DENTRO da base, não
 * "estacionada" ao lado. Sem isso, o reposicionamento do undock
 * (`round-4-fixes`) não tinha como ser percebido: o ícone parado ali o tempo
 * todo (5ª rodada, item 25.1).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQuadrantCells, cellKey } from '@/composables/useQuadrantCells'
import { useGameState } from '@/stores/useGameState'

describe('useQuadrantCells — marcador da nave some atracada', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('grid sem marcador enquanto docked', () => {
    const gameState = useGameState()
    gameState.$state.docked = true
    const { sectorCells } = useQuadrantCells()

    const shipSector = { row: 3, col: 3 }
    const grid = sectorCells([], shipSector)

    expect(grid[cellKey(shipSector)]).toBeUndefined()
  })

  it('marcador reaparece quando não está docked', () => {
    const gameState = useGameState()
    gameState.$state.docked = false
    const { sectorCells } = useQuadrantCells()

    const shipSector = { row: 3, col: 3 }
    const grid = sectorCells([], shipSector)

    expect(grid[cellKey(shipSector)]).toBeDefined()
  })
})
