/**
 * Consultas sobre o setor atual: classificação de entidade, visibilidade,
 * ocupação de célula e adjacência.
 *
 * **Segunda folha** da árvore de dependências, ao lado de `constants.ts`: importa
 * SÓ de `types/game.ts`, nunca de outro `engine/*.ts`. Existe porque
 * `damageControl.ts` importava `getVisibleEnemies` de `combat.ts` — irmão
 * importando irmão, violação do invariante da decisão #36 da `fase-4-engine`.
 * Mover pra `constants.ts` resolveria o grafo, mas botaria consulta de domínio
 * num arquivo que promete constantes e matemática pura (design.md decisão 2).
 *
 * Consumidores: `combat`, `damageControl`, `navigation`, `docking`, `worldGen`.
 */

import {
  ENEMY_TYPES,
  STARBASE_TYPES,
  type EnemyType,
  type GameState,
  type GridCoord,
  type SectorEntity,
  type StarbaseType,
} from '@/types/game'

// Set em vez de `Array.includes`: são consultas de laço quente (todo turno, por
// entidade), e o custo de construir os sets é uma vez por módulo.
const ENEMY_TYPE_SET: ReadonlySet<string> = new Set(ENEMY_TYPES)
const STARBASE_TYPE_SET: ReadonlySet<string> = new Set(STARBASE_TYPES)

// ── Classificação de tipo ───────────────────────────────────────────────────

/** Tipo hostil atacável. `KLINGON_BASE` é cenário e fica de fora de propósito. */
export function isEnemyType(type: string): type is EnemyType {
  return ENEMY_TYPE_SET.has(type)
}

/** Uma das 3 bases aliadas (conta pra `starbasesLeft`, permite docking). */
export function isStarbaseType(type: string): type is StarbaseType {
  return STARBASE_TYPE_SET.has(type)
}

/** Bloqueia movimento e ocupa célula, mas não é alvo: estrela e planeta. */
export function isObstacleType(type: string): boolean {
  return type === 'star' || type === 'planet'
}

// ── Visibilidade ────────────────────────────────────────────────────────────

/**
 * Hostis visíveis: cloacado não conta. Fonte única — `combat` (alvos, lock,
 * contra-ataque) e `damageControl` (risco da missão de Send Party) precisam da
 * MESMA resposta pro mesmo estado, e é isso que o import cruzado tentava
 * garantir do jeito errado.
 */
export function getVisibleEnemies(state: GameState): SectorEntity[] {
  return state.currentSector.filter((e) => isEnemyType(e.type) && !e.cloaked)
}

/** Hostis presentes, cloacados incluídos. É o que decide "setor hostil". */
export function countEnemies(entities: SectorEntity[]): number {
  return entities.filter((e) => isEnemyType(e.type)).length
}

// ── Ocupação e adjacência ───────────────────────────────────────────────────

export function cellKey(c: GridCoord): string {
  return `${c.row},${c.col}`
}

/** Células ocupadas por qualquer entidade do setor. */
export function occupiedCells(entities: SectorEntity[]): Set<string> {
  return new Set(entities.map((e) => cellKey(e.position)))
}

/** Predicado de ocupação, formato que `navigation` consome pra rota. */
export function occupancyOf(
  entities: SectorEntity[],
): (c: GridCoord) => boolean {
  const taken = occupiedCells(entities)
  return (c) => taken.has(cellKey(c))
}

/**
 * Adjacência de Chebyshev ≤ 1 — as 8 vizinhas mais a própria célula. Padrão
 * único de Send Party e de Docking (decisão #23); estavam duplicadas em
 * `docking.ts` e inline em `damageControl.ts`.
 */
export function isAdjacent(a: GridCoord, b: GridCoord): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1
}

// ── Linha de tiro ───────────────────────────────────────────────────────────

/** Distância Chebyshev — a mesma régua do resto do jogo (warp, sonda, adjacência). */
export function chebyshev(a: GridCoord, b: GridCoord): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col))
}

/**
 * Células ENTRE dois pontos, exclusivas das pontas (Bresenham).
 *
 * Mora aqui, na folha, porque `combat.ts` (tiro do jogador) e o contra-ataque
 * inimigo no `turnEngine` precisam da MESMA resposta pra mesma geometria —
 * cobertura tem que valer nos dois sentidos ou vira vantagem de um lado só.
 */
export function lineBetween(a: GridCoord, b: GridCoord): GridCoord[] {
  const out: GridCoord[] = []
  let row = a.row
  let col = a.col
  const dRow = Math.abs(b.row - row)
  const dCol = Math.abs(b.col - col)
  const stepRow = row < b.row ? 1 : -1
  const stepCol = col < b.col ? 1 : -1
  let err = dCol - dRow

  // Guarda de iteração: grid é 8x8, nenhuma linha honesta passa de 16 passos.
  for (let guard = 0; guard < 32; guard++) {
    const e2 = 2 * err
    if (e2 > -dRow) {
      err -= dRow
      col += stepCol
    }
    if (e2 < dCol) {
      err += dCol
      row += stepRow
    }
    if (row === b.row && col === b.col) break
    out.push({ row, col })
  }
  return out
}

/**
 * Obstáculos (estrela/planeta) na linha reta entre dois pontos.
 *
 * Phaser viaja reto e é barrado por eles — é o vocabulário visual que a
 * apresentação já desenha. Torpedo é guiado e passa, pagando chance de erro.
 */
export function obstaclesBetween(
  entities: SectorEntity[],
  from: GridCoord,
  to: GridCoord,
): number {
  const path = lineBetween(from, to)
  if (path.length === 0) return 0
  const blocked = new Set(
    entities.filter((e) => isObstacleType(e.type)).map((e) => cellKey(e.position)),
  )
  return path.filter((c) => blocked.has(cellKey(c))).length
}
