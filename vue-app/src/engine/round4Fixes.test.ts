/**
 * Consertos da 4ª rodada: reposicionamento no undock, custo de turno da
 * atracagem, bloqueio de manobra atracado e estresse de warp alto.
 */

import { describe, expect, it } from 'vitest'
import { undock } from '@/engine/docking'
import { resolvePlayerTurn } from '@/engine/turnEngine'
import { warpStress } from '@/engine/navigation'
import { WARP_SAFE_FACTOR, WARP_STRESS_PER_POINT } from '@/engine/constants'
import { createNewGameState } from '@/engine/newGame'
import { SectorEntityType, type SectorEntity } from '@/types/game'

const base = (row: number, col: number): SectorEntity => ({
  id: 'b1',
  type: SectorEntityType.STARBASE_DOCK,
  position: { row, col },
})

/** Nave atracada ao lado de uma base em (row,col). */
function atracado(row: number, col: number, extra: SectorEntity[] = []) {
  const state = createNewGameState(1)
  state.currentSector = [base(row, col), ...extra]
  state.position.sector = { row, col }
  state.docked = true
  state.dockedBaseId = 'b1'
  return state
}

describe('round-4-fixes — undock reposiciona', () => {
  it('a nave termina numa célula adjacente à base', () => {
    const state = atracado(4, 4)
    undock(state)

    const { row, col } = state.position.sector
    expect(Math.max(Math.abs(row - 4), Math.abs(col - 4))).toBe(1)
    expect(state.docked).toBe(false)
  })

  it('base na borda não joga a nave pra fora do grid', () => {
    // O caso que a 4ª rodada encontrou: "e quando a base está na borda
    // esquerda do mapa?". Direção fixa quebraria aqui.
    for (const [row, col] of [[1, 1], [1, 8], [8, 1], [8, 8], [1, 4], [4, 1]]) {
      const state = atracado(row, col)
      undock(state)
      const p = state.position.sector
      expect(p.row).toBeGreaterThanOrEqual(1)
      expect(p.row).toBeLessThanOrEqual(8)
      expect(p.col).toBeGreaterThanOrEqual(1)
      expect(p.col).toBeLessThanOrEqual(8)
    }
  })

  it('vizinhança lotada cai pra célula livre, sem sobrepor', () => {
    const vizinhas: SectorEntity[] = []
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue
        vizinhas.push({
          id: `s-${dRow}-${dCol}`,
          type: SectorEntityType.STAR,
          position: { row: 4 + dRow, col: 4 + dCol },
        })
      }
    }
    const state = atracado(4, 4, vizinhas)
    undock(state)

    const ocupadas = state.currentSector.map((e) => `${e.position.row},${e.position.col}`)
    const p = `${state.position.sector.row},${state.position.sector.col}`
    expect(ocupadas).not.toContain(p)
  })
})

describe('round-4-fixes — manobra atracado', () => {
  it('impulso é recusado enquanto atracado, sem gastar turno', () => {
    const state = atracado(4, 4)
    const stardate = state.stardate

    const res = resolvePlayerTurn(state, {
      type: 'move_impulse',
      targetCoord: { row: 6, col: 6 },
    })

    expect(res.rejected).toBe(true)
    expect(res.rejectionReason).toContain('atracada')
    expect(state.stardate).toBe(stardate)
  })

  it('warp também é recusado', () => {
    const state = atracado(4, 4)
    const res = resolvePlayerTurn(state, {
      type: 'move_warp',
      targetCoord: { row: 6, col: 6 },
    })
    expect(res.rejected).toBe(true)
  })

  it('desatracado, a manobra volta a ser aceita', () => {
    const state = atracado(4, 4)
    undock(state)
    const res = resolvePlayerTurn(state, {
      type: 'move_impulse',
      targetCoord: { row: 6, col: 6 },
    })
    expect(res.rejected).toBe(false)
  })
})

describe('round-4-fixes — estresse de warp alto', () => {
  it('cruzeiro no fator seguro não estressa', () => {
    expect(warpStress(WARP_SAFE_FACTOR)).toBe(0)
    expect(warpStress(1)).toBe(0)
  })

  it('acima do seguro o estresse dá pra sentir', () => {
    // Com 2 por ponto, 5 travessias em warp 8 custavam 1% de integridade.
    expect(WARP_STRESS_PER_POINT).toBeGreaterThan(2)
    expect(warpStress(8)).toBe(4 * WARP_STRESS_PER_POINT)
  })
})
