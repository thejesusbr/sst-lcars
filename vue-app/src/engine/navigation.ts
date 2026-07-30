/**
 * Navegação: distância, warp, auto-nav, boost, sonda, LRS e Star Chart.
 *
 * Funções puras — recebem estado/parâmetros e devolvem valores novos, nunca
 * mutam nada. Todo sorteio recebe `rng` injetável pra o teste ser determinístico.
 *
 * Só importa de `types/game` e `engine/constants` (folha da árvore), nunca de
 * outro `engine/*.ts` (design.md decisão #36).
 */

import type {
  GameState,
  GridCoord,
  QuadrantMap,
  SectorEntity,
  Starbase,
  WarpTrip,
} from '@/types/game'
import {
  kbsCode,
  AUTO_NAV_DRAW,
  BOOST_COOLDOWN_FACTOR,
  BOOST_MAX_TURNS,
  HOSTILE_RISK_BASE,
  HOSTILE_RISK_PER_EXTRA_ENEMY,
  IMPULSE_POWER_MAX,
  SCAN_CONFIDENCE_FLOOR,
  SCAN_DECAY_PER_TURN,
  WARP_FACTOR_MAX,
  WARP_SAFE_FACTOR,
  WARP_STRESS_PER_POINT,
  clamp,
  damageFraction,
  degradedChance,
  isCritical,
} from '@/engine/constants'

const GRID_MIN = 1
const GRID_MAX = 8

/** `true` se a coordenada cai dentro do grid 8x8 (1-8 nos dois eixos). */
export function inGrid(c: GridCoord): boolean {
  return (
    c.row >= GRID_MIN &&
    c.row <= GRID_MAX &&
    c.col >= GRID_MIN &&
    c.col <= GRID_MAX
  )
}

/** Chave canônica `"row,col"` de `QuadrantMap`. */
export function coordKey(c: GridCoord): string {
  return `${c.row},${c.col}`
}

export function sameCoord(a: GridCoord, b: GridCoord): boolean {
  return a.row === b.row && a.col === b.col
}

// ── Distância ───────────────────────────────────────────────────────────────

/**
 * Distância de Chebyshev: `max(|dx|, |dy|)`. Métrica única de TODO cálculo
 * desta capability (movimento, sonda, escolha de rota) — diagonal custa o mesmo
 * passo que cardinal, igual ao D-Pad.
 */
export function chebyshev(a: GridCoord, b: GridCoord): number {
  return Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col))
}

/** Predicado de ocupação a partir das entidades do setor. */
export function occupancyOf(
  entities: SectorEntity[],
): (c: GridCoord) => boolean {
  const taken = new Set(entities.map((e) => coordKey(e.position)))
  return (c) => taken.has(coordKey(c))
}

// ── Warp: duração e estresse ────────────────────────────────────────────────

/** Turnos pra cobrir `distance` no fator escolhido: `ceil(distance/warpFactor)`. */
export function warpTravelTurns(distance: number, warpFactor: number): number {
  return Math.ceil(distance / Math.max(1, warpFactor))
}

/**
 * Overload efetivo transitório somado ao `manualOverload` em cada turno de
 * viagem: `+2` por ponto de warp acima de 4. Warp <= 4 não estressa nada.
 */
export function warpStress(warpFactor: number): number {
  return Math.max(0, warpFactor - WARP_SAFE_FACTOR) * WARP_STRESS_PER_POINT
}

// ── Warp Engines danificados ────────────────────────────────────────────────

/** Teto efetivo de energia do Impulso: `2000 * (1 - d)`. */
export function effectiveImpulseMax(integrity: number): number {
  return IMPULSE_POWER_MAX * (1 - damageFraction(integrity))
}

/** Clampa o dial 0-100% do Impulso no teto reduzido pelo dano. */
export function clampImpulsePower(dial: number, integrity: number): number {
  return clamp(dial, 0, 100 * (1 - damageFraction(integrity)))
}

/** `floor(8 * (1 - d))`, piso 1 fora do crítico; 0 (paralisado) em crítico. */
export function effectiveMaxWarpFactor(integrity: number): number {
  if (isCritical(integrity)) return 0
  const d = damageFraction(integrity)
  return Math.max(1, Math.floor(WARP_FACTOR_MAX * (1 - d)))
}

export function clampWarpFactor(warpFactor: number, integrity: number): number {
  return Math.min(warpFactor, effectiveMaxWarpFactor(integrity))
}

/** Em crítico (integridade < 40) nenhum modo de propulsão engaja. */
export function propulsionBlocked(integrity: number): boolean {
  return isCritical(integrity)
}

/**
 * Estagnação do motor: turno consumido sem avançar. `max(0, d-0.3)` de chance,
 * só a partir do moderado.
 */
export function rollStall(
  integrity: number,
  rng: () => number = Math.random,
): boolean {
  return rng() < degradedChance(integrity)
}

// ── Navegação manual: para curto em obstáculo ───────────────────────────────

/**
 * Caminho reto em Chebyshev de `from` até `to`, sem incluir `from`. Cada passo
 * anda 1 em cada eixo que ainda tem diferença (diagonal enquanto der).
 */
export function directPath(from: GridCoord, to: GridCoord): GridCoord[] {
  const path: GridCoord[] = []
  let cur = from
  while (!sameCoord(cur, to)) {
    cur = {
      row: cur.row + Math.sign(to.row - cur.row),
      col: cur.col + Math.sign(to.col - cur.col),
    }
    path.push(cur)
  }
  return path
}

export interface MoveResult {
  /** Onde a nave para de fato. */
  position: GridCoord
  /** Destino fora do grid: movimento recusado, posição inalterada. */
  rejected: boolean
  /** Parou antes do destino por causa de obstáculo (rende log de combate). */
  interrupted: boolean
}

/**
 * Movimento manual: segue o caminho reto e para na última célula livre antes de
 * um obstáculo (não colide, não toma dano, não é recusado). Destino fora do
 * grid, esse sim, é recusado.
 */
export function manualMove(
  from: GridCoord,
  to: GridCoord,
  isOccupied: (c: GridCoord) => boolean,
): MoveResult {
  if (!inGrid(to)) return { position: from, rejected: true, interrupted: false }
  let position = from
  for (const step of directPath(from, to)) {
    if (isOccupied(step)) {
      return { position, rejected: false, interrupted: true }
    }
    position = step
  }
  return { position, rejected: false, interrupted: false }
}

// ── Auto-Nav Computer ───────────────────────────────────────────────────────

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

/**
 * Rota mais curta desviando de células ocupadas (BFS 8-direções no grid 8x8;
 * 64 células, não vale nada mais esperto que isso). Devolve os passos sem
 * incluir `from`, ou `null` se não houver rota.
 */
export function findRoute(
  from: GridCoord,
  to: GridCoord,
  isOccupied: (c: GridCoord) => boolean,
): GridCoord[] | null {
  if (!inGrid(to) || isOccupied(to)) return null
  if (sameCoord(from, to)) return []

  const parents = new Map<string, GridCoord | null>([[coordKey(from), null]])
  const queue: GridCoord[] = [from]

  while (queue.length > 0) {
    const cur = queue.shift() as GridCoord
    for (const [dr, dc] of NEIGHBORS) {
      const next = { row: cur.row + dr, col: cur.col + dc }
      const key = coordKey(next)
      if (!inGrid(next) || parents.has(key) || isOccupied(next)) continue
      parents.set(key, cur)
      if (sameCoord(next, to)) {
        const route: GridCoord[] = []
        for (let c: GridCoord | null = next; c && !sameCoord(c, from); ) {
          route.unshift(c)
          c = parents.get(coordKey(c)) ?? null
        }
        return route
      }
      queue.push(next)
    }
  }
  return null
}

/** Draw por turno engajado: `100 * (1 + d)`. */
export function autoNavDraw(integrity: number): number {
  return AUTO_NAV_DRAW * (1 + damageFraction(integrity))
}

/** Em crítico o toggle nem engaja, e uma viagem em curso cai pro manual. */
export function autoNavAvailable(integrity: number): boolean {
  return !isCritical(integrity)
}

/** Chance/turno de a rota degradar e a nave parar curto, igual ao manual. */
export function rollRouteDegraded(
  integrity: number,
  rng: () => number = Math.random,
): boolean {
  return rng() < degradedChance(integrity)
}

// ── Planejamento da viagem ──────────────────────────────────────────────────

export interface WarpPlanParams {
  from: GridCoord
  to: GridCoord
  warpFactor: number
  /** Toggle do Auto-Nav Computer no momento do engage. */
  autoNav: boolean
  isOccupied: (c: GridCoord) => boolean
  /** Integridade de Warp Engines. */
  warpIntegrity: number
  /** Integridade do Auto-Navigation Computer. */
  autoNavIntegrity: number
}

export type WarpPlan =
  | { ok: true; trip: WarpTrip }
  | { ok: false; reason: 'out_of_grid' | 'engines_critical' }

/**
 * Monta o `WarpTrip`. Auto-Nav só vale se estiver ligado E não-crítico E existir
 * rota livre; sem isso cai pro manual (`route: []`, para curto no caminho).
 * O `warpFactor` já sai clampado no teto que o dano permite.
 */
export function planWarpTrip(params: WarpPlanParams): WarpPlan {
  const { from, to, isOccupied } = params
  if (!inGrid(to)) return { ok: false, reason: 'out_of_grid' }
  if (propulsionBlocked(params.warpIntegrity)) {
    return { ok: false, reason: 'engines_critical' }
  }

  const warpFactor = clampWarpFactor(params.warpFactor, params.warpIntegrity)
  const useAutoNav =
    params.autoNav && autoNavAvailable(params.autoNavIntegrity)
  const route = useAutoNav ? findRoute(from, to, isOccupied) : null
  const distance = route ? route.length : chebyshev(from, to)

  return {
    ok: true,
    trip: {
      destination: to,
      warpFactor,
      turnsRemaining: warpTravelTurns(distance, warpFactor),
      route: route ?? [],
      autoNav: route !== null,
    },
  }
}

// ── Boost ───────────────────────────────────────────────────────────────────

export interface BoostState {
  active: boolean
  turnsUsed: number
  cooldown: number
}

/** Cooldown = `ceil(1.5 × turnos realmente usados)`. */
export function boostCooldownTurns(turnsUsed: number): number {
  return Math.ceil(BOOST_COOLDOWN_FACTOR * turnsUsed)
}

export function canEngageBoost(boost: BoostState): boolean {
  return !boost.active && boost.cooldown === 0
}

/** Desliga o boost (manual ou por teto) e abre o cooldown proporcional. */
export function endBoost(boost: BoostState): BoostState {
  return {
    active: false,
    turnsUsed: 0,
    cooldown: boostCooldownTurns(boost.turnsUsed),
  }
}

/**
 * Um turno de boost. Só consome duração em turno com movimento real sob
 * impulso; ligado e parado não gasta nada. No 5º turno usado, desliga sozinho.
 */
export function tickBoost(
  boost: BoostState,
  movedUnderImpulse: boolean,
): BoostState {
  if (!boost.active) {
    return { ...boost, cooldown: Math.max(0, boost.cooldown - 1) }
  }
  if (!movedUnderImpulse) return boost
  const turnsUsed = boost.turnsUsed + 1
  if (turnsUsed >= BOOST_MAX_TURNS) return endBoost({ ...boost, turnsUsed })
  return { ...boost, turnsUsed }
}

// ── Sonda ───────────────────────────────────────────────────────────────────

/** `distância + 1` turnos: viagem a warp 1 mais 1 turno de scan. */
export function probeTurns(distance: number): number {
  return distance + 1
}

/** `40% + 5%` por inimigo além do primeiro; 0 em setor sem inimigo. */
export function hostileRisk(enemyCount: number): number {
  if (enemyCount <= 0) return 0
  return HOSTILE_RISK_BASE + HOSTILE_RISK_PER_EXTRA_ENEMY * (enemyCount - 1)
}

/** Checagem única na chegada, antes do turno de scan. */
export function rollProbeDestroyed(
  enemyCount: number,
  rng: () => number = Math.random,
): boolean {
  return enemyCount > 0 && rng() < hostileRisk(enemyCount)
}

export interface ProbeScanResult {
  /** Código KBS revelado, ou `null` se a sonda foi destruída. */
  code: string | null
  /** Se havia planeta no quadrante escaneado. */
  planet: boolean
  /** Cargas de dilítium reveladas (0 se estéril ou sem planeta). */
  dilithiumCharges: number
  /** Linhas pro combat log. */
  log: string[]
}

/**
 * Resolve o scan de uma sonda que chegou ao alvo.
 *
 * A sonda é o **trunfo** da caça ao dilítium: além do KBS, ela revela planeta E
 * cargas, e marca o planeta como pesquisado **sem consumir carga** — poupando os
 * 3 turnos e o risco de uma missão de Send Party às cegas
 * (world-generation design.md decisão 9).
 *
 * Escreve direto em `galaxy[alvo].surveyed` e em `exploredQuadrants`; o chamador
 * (`turnEngine`) só precisa anexar `log` ao combat log.
 */
export function resolveProbeScan(
  state: GameState,
  target: GridCoord,
  destroyed: boolean,
): ProbeScanResult {
  const key = `${target.row},${target.col}`
  const q = state.galaxy?.[key]

  if (destroyed || !q) {
    return {
      code: null,
      planet: false,
      dilithiumCharges: 0,
      log: ['Contato perdido com a sonda — nenhum dado recebido.'],
    }
  }

  const code = kbsCode({
    klingons: q.klingons,
    bases: q.baseIds.length,
    stars: q.stars,
  })
  state.exploredQuadrants[key] = { code, age: 0 }

  const log = [`Sonda reporta quadrante ${key}: KBS ${code}.`]

  if (q.planet) {
    // Revelar não gasta carga — a sonda só observa.
    q.surveyed = true
    log.push(
      q.dilithiumCharges > 0
        ? `Planeta detectado com ${q.dilithiumCharges} carga(s) de dilítium.`
        : 'Planeta detectado, sem dilítium aproveitável.',
    )
  }

  return {
    code,
    planet: q.planet,
    dilithiumCharges: q.planet ? q.dilithiumCharges : 0,
    log,
  }
}

// ── LRS ─────────────────────────────────────────────────────────────────────

/** Os até 9 quadrantes do bloco 3x3 centrado em `quadrant`, recortado no grid. */
export function lrsNeighborhood(quadrant: GridCoord): GridCoord[] {
  const cells: GridCoord[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = { row: quadrant.row + dr, col: quadrant.col + dc }
      if (inGrid(c)) cells.push(c)
    }
  }
  return cells
}

/**
 * Confiança 0-1 de um dado escaneado: decai `5% * (1 + d)` por turno desde o
 * scan, piso 30%. `integrity` é a do LRS (100 = sem dano; Star Chart usa o
 * default, já que não tem subsistema próprio).
 */
export function scanConfidence(age: number, integrity = 100): number {
  const decay = SCAN_DECAY_PER_TURN * (1 + damageFraction(integrity))
  return clamp(1 - decay * age, SCAN_CONFIDENCE_FLOOR, 1)
}

/** Em crítico o LRS se comporta como desligado e o toggle fica travado. */
export function lrsDisabled(integrity: number): boolean {
  return isCritical(integrity)
}

// ── Star Chart ──────────────────────────────────────────────────────────────

/**
 * Marca/atualiza um quadrante explorado: grava o KBS atual e zera a idade
 * (= confiança 100%). Mesma operação pro primeiro reveal e pro refresh, venha
 * de LRS, sonda, interrogatório ou evento reportado. Devolve mapa novo.
 */
export function markExplored(
  map: QuadrantMap,
  quadrant: GridCoord,
  code: string,
): QuadrantMap {
  return { ...map, [coordKey(quadrant)]: { code, age: 0 } }
}

/** Aplica `markExplored` a vários quadrantes de uma vez (scan de LRS). */
export function markManyExplored(
  map: QuadrantMap,
  entries: ReadonlyArray<{ quadrant: GridCoord; code: string }>,
): QuadrantMap {
  return entries.reduce(
    (acc, e) => markExplored(acc, e.quadrant, e.code),
    map,
  )
}

// ── Destino: base mais próxima / undock ─────────────────────────────────────

/**
 * Base conhecida (já explorada) mais próxima, por Chebyshev entre quadrantes.
 * Só preenche destino — como viajar até lá continua escolha do jogador.
 */
export function nearestKnownStarbase(
  from: GridCoord,
  starbases: Starbase[],
  explored: QuadrantMap,
): Starbase | null {
  const known = starbases.filter(
    (b) => !b.destroyed && coordKey(b.quadrant) in explored,
  )
  if (known.length === 0) return null
  return known.reduce((best, b) =>
    chebyshev(from, b.quadrant) < chebyshev(from, best.quadrant) ? b : best,
  )
}

/**
 * Undock: setor imediatamente a sudoeste da base (linha+1, coluna-1), recortado
 * no grid pra base na borda. Ação livre, não consome stardate.
 */
export function undockSector(baseSector: GridCoord): GridCoord {
  return {
    row: clamp(baseSector.row + 1, GRID_MIN, GRID_MAX),
    col: clamp(baseSector.col - 1, GRID_MIN, GRID_MAX),
  }
}
