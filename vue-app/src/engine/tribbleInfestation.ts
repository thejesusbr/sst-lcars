/**
 * Easter egg dos Tribbles — ligado só pelo flag escondido
 * `tribbleInfestationActive` (ver `saveIntegrity.ts`). Sem cura: não existe, de
 * propósito, nenhuma API pública ou caminho de UI que desligue a infestação.
 *
 * Spec: openspec/changes/fase-4-engine/specs/save-integrity/spec.md
 */

import type { GameState } from '@/types/game'
import { TRIBBLE_RENDER_CAP } from '@/engine/constants'

/** População inicial no primeiro turno com a infestação ativa. */
export const TRIBBLE_SEED = 2

/**
 * Avança a população em uma resolução de turno: dobra a cada turno a partir do
 * seed, sem teto numérico (a piada é o crescimento exponencial). O teto de 200
 * é só de renderização, ver `renderedTribbleCount`.
 */
export function advanceTribbleInfestation(state: GameState): void {
  if (!state.tribbleInfestationActive) return
  state.tribblePopulation = state.tribblePopulation > 0 ? state.tribblePopulation * 2 : TRIBBLE_SEED
}

/** Quantos ícones flutuantes desenhar: população real, limitada a 200. */
export function renderedTribbleCount(population: number): number {
  return Math.min(Math.max(0, Math.floor(population)), TRIBBLE_RENDER_CAP)
}
