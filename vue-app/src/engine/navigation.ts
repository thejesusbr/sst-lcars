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
  QuadrantContent,
  QuadrantMap,
  Starbase,
  TurnEventDraft,
  WarpTrip,
} from '@/types/game'
import {
  liveKbsCode,
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

// `occupancyOf` mora em `engine/sector.ts` (folha) e é reexportada aqui pra não
// quebrar quem já importava daqui: ocupação de célula é consulta de setor, e
// `worldGen` precisa da mesma resposta sem importar navegação.
export { occupancyOf } from '@/engine/sector'

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
 *
 * `maxSteps` limita quantas células o turno cobre — é como a potência do
 * Impulso vira tempo de viagem (`impulseCellsPerTurn`). Parar por limite de
 * velocidade não é `interrupted`: é trânsito, o jogador engaja de novo.
 */
export function manualMove(
  from: GridCoord,
  to: GridCoord,
  isOccupied: (c: GridCoord) => boolean,
  maxSteps = Infinity,
): MoveResult {
  if (!inGrid(to)) return { position: from, rejected: true, interrupted: false }
  let position = from
  let steps = 0
  for (const step of directPath(from, to)) {
    if (steps >= maxSteps) break
    if (isOccupied(step)) {
      return { position, rejected: false, interrupted: true }
    }
    position = step
    steps++
  }
  return { position, rejected: false, interrupted: false }
}

/**
 * Células cobertas por turno sob impulso: `max(1, round(8 × dial/100))`.
 *
 * Reusa a régua do fonte de 1978 (`N=INT(W1*8+.5)`: fração da velocidade × 8
 * setores por comando) — dial a 100% cruza o setor inteiro em 1 turno, a 50%
 * são 4 células/turno, a 25% são 2. Boost força 100%. É o que faz a potência
 * do Impulso influenciar a DURAÇÃO do movimento, não só o consumo — distâncias
 * em Star Trek são grandes, andar devagar custa turnos.
 */
export function impulseCellsPerTurn(dial: number, boostActive = false): number {
  const effective = boostActive ? 100 : clamp(dial, 0, 100)
  return Math.max(1, Math.round((GRID_MAX * effective) / 100))
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
  /** Eventos pro combat log. A etapa é carimbada pelo `turnEngine`. */
  log: TurnEventDraft[]
}

function pluralPt(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

/**
 * Descreve um quadrante em PROSA, não no código KBS cru — usuário: trocar
 * "KBS 123" por "x naves inimigas, uma base estelar e y estrelas"
 * (`round-6-polish`, obs. geral do relatório da sonda). Conta direto dos
 * campos de `content`, não reparseia o código — mesmos números que
 * `liveKbsCode` computa (baixas e Cloaked Raider já descontados).
 */
function describeQuadrantContent(q: QuadrantContent): string {
  const enemies = Math.max(0, q.klingons - q.clearedEnemies - (q.cloakedRaiders ?? 0))
  const naves = pluralPt(enemies, 'nave inimiga', 'naves inimigas')
  const bases = pluralPt(q.baseIds.length, 'base estelar', 'bases estelares')
  const estrelas = pluralPt(q.stars, 'estrela', 'estrelas')
  return `${naves}, ${bases} e ${estrelas}`
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
      log: [
        {
          type: 'probe_report',
          text: 'Contato perdido com a sonda — nenhum dado recebido.',
        },
      ],
    }
  }

  const code = liveKbsCode(q)
  state.exploredQuadrants[key] = { code, age: 0 }
  // Datalink: a sonda alimenta o LRS também, não só o Star Chart — o código
  // aparece no display de longo alcance como se tivesse sido escaneado agora.
  state.lrsScan[key] = { code, age: 0 }

  // Coordenadas SEMPRE X,Y (col,row) em texto de UI — a chave interna é row,col.
  const xy = `${target.col},${target.row}`
  const log: TurnEventDraft[] = [
    {
      type: 'probe_report',
      text: `Sonda reporta quadrante ${xy}: ${describeQuadrantContent(q)}.`,
    },
  ]

  if (q.planet) {
    // Revelar não gasta carga — a sonda só observa.
    q.surveyed = true
    log.push({
      type: 'probe_report',
      amount: q.dilithiumCharges,
      text:
        q.dilithiumCharges > 0
          ? `Planeta detectado em ${xy} com ${q.dilithiumCharges} carga(s) de dilítium.`
          : `Planeta detectado em ${xy}, sem dilítium aproveitável.`,
    })
  }

  return {
    code,
    planet: q.planet,
    dilithiumCharges: q.planet ? q.dilithiumCharges : 0,
    log,
  }
}

export interface ProbeLaunchResult {
  success: boolean
  reason?: 'no_probes' | 'out_of_grid' | 'probe_in_flight'
  /** Turnos até a resolução, quando lançou. */
  turns?: number
}

/**
 * Lança a sonda: consome estoque e agenda a resolução em `distância + 1` turnos.
 *
 * O `turnEngine` antes cravava `turnsRemaining: 2` e nunca decrementava
 * `remainingProbes` — sondas eram infinitas e a distância era ignorada.
 * Rejeição NÃO consome turno; é o chamador que decide não resolver o turno.
 */
export function launchProbe(
  state: GameState,
  target: GridCoord,
): ProbeLaunchResult {
  if (!inGrid(target)) return { success: false, reason: 'out_of_grid' }
  if (state.probe) return { success: false, reason: 'probe_in_flight' }
  if (state.remainingProbes <= 0) return { success: false, reason: 'no_probes' }

  const turns = probeTurns(chebyshev(state.position.quadrant, target))
  state.remainingProbes -= 1
  state.probe = { target: { ...target }, turnsRemaining: turns }
  return { success: true, turns }
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

// ── Tick por turno ──────────────────────────────────────────────────────────

export interface NavigationTurnOptions {
  /** Só turno de movimento real sob impulso gasta duração de boost. */
  movedUnderImpulse?: boolean
  /**
   * Ocupação no grid de **quadrantes**, pro fallback de rota do Auto-Nav.
   * Injetada porque depende do que o jogador **conhece** (código KBS em
   * `exploredQuadrants`), e essa política é do `turnEngine`, não daqui.
   */
  quadrantOccupied?: (c: GridCoord) => boolean
}

export interface NavigationTurnResult {
  /** Quadrante em que a nave chegou neste turno, ou `null`. */
  arrivedQuadrant: GridCoord | null
  /** Viagem abortada curto (estagnação de motor ou rota degradada). */
  interrupted: boolean
  probeResolved: boolean
  probeScan: ProbeScanResult | null
  events: TurnEventDraft[]
}

/**
 * Um turno de navegação: progressão de viagem de warp, sonda, boost e
 * envelhecimento de sensores.
 *
 * Diferente do resto deste módulo (funções puras que devolvem valor novo), o
 * tick **muta** `state` — mesmo padrão de `resolveDamageControlTurn` e
 * `passivePhaserCooldown`. É o preço de ter um lugar só onde o turno acontece;
 * as regras continuam nos helpers puros acima, testáveis isoladamente.
 */
export function resolveNavigationTurn(
  state: GameState,
  options: NavigationTurnOptions = {},
  rng: () => number = Math.random,
): NavigationTurnResult {
  const events: TurnEventDraft[] = []
  let arrivedQuadrant: GridCoord | null = null
  let interrupted = false

  // ── Boost: duração só em turno de movimento, cooldown sempre ──────────────
  const boost = tickBoost(
    {
      active: state.boostActive,
      turnsUsed: state.boostTurnsUsed,
      cooldown: state.boostCooldown,
    },
    options.movedUnderImpulse ?? false,
  )
  if (state.boostActive && !boost.active) {
    events.push({
      type: 'movement',
      text: 'Impulse Boost esgotado — motores em cooldown.',
    })
  }
  state.boostActive = boost.active
  state.boostTurnsUsed = boost.turnsUsed
  state.boostCooldown = boost.cooldown

  // ── Viagem de warp em curso ───────────────────────────────────────────────
  if (state.warpTrip) {
    const trip = state.warpTrip
    const warpIntegrity = state.subsystems.warp
    const autoNavIntegrity = state.subsystems.autoNav

    if (propulsionBlocked(warpIntegrity)) {
      // Dano cruzou pro crítico no meio da viagem: motores não seguram.
      state.warpTrip = null
      interrupted = true
      events.push({
        type: 'movement',
        text: 'Warp Engines em estado crítico — viagem abortada.',
      })
    } else if (rollStall(warpIntegrity, rng)) {
      // Turno consumido sem avançar: a viagem fica 1 turno mais longa.
      events.push({
        type: 'movement',
        text: 'Motores estagnaram — nenhum avanço neste turno.',
      })
    } else {
      // Auto-Nav degradado ou crítico cai pra regra manual: para na última
      // célula livre do caminho reto e ABANDONA o resto da viagem.
      const autoNavLost =
        trip.autoNav &&
        (!autoNavAvailable(autoNavIntegrity) ||
          rollRouteDegraded(autoNavIntegrity, rng))

      if (autoNavLost) {
        const isOccupied = options.quadrantOccupied ?? (() => false)
        const halt = manualMove(state.position.quadrant, trip.destination, isOccupied)
        state.position.quadrant = halt.position
        state.warpTrip = null
        interrupted = true
        events.push({
          type: 'movement',
          text: 'Auto-Nav perdeu a rota — nave parou curto do destino.',
        })
        if (!sameCoord(halt.position, trip.destination)) {
          arrivedQuadrant = halt.position
        }
      } else {
        trip.turnsRemaining -= 1
        if (trip.turnsRemaining <= 0) {
          state.position.quadrant = { ...trip.destination }
          state.warpTrip = null
          arrivedQuadrant = { ...trip.destination }
          events.push({
            type: 'movement',
            text: `Chegada ao quadrante ${trip.destination.col},${trip.destination.row}.`,
          })
        }
      }
    }
  }

  // ── Sonda ─────────────────────────────────────────────────────────────────
  let probeResolved = false
  let probeScan: ProbeScanResult | null = null
  if (state.probe) {
    state.probe.turnsRemaining -= 1
    if (state.probe.turnsRemaining <= 0) {
      const target = state.probe.target
      state.probe = null
      probeResolved = true

      // Inimigos do quadrante ALVO (não do atual): o risco é de onde a sonda
      // chegou. Sem galáxia gerada, `klingons` cai pra 0 e nada é arriscado.
      const enemies =
        state.galaxy?.[`${target.row},${target.col}`]?.klingons ?? 0
      const destroyed = rollProbeDestroyed(enemies, rng)
      probeScan = resolveProbeScan(state, target, destroyed)
      events.push(...probeScan.log)
    }
  }

  // ── Envelhecimento de sensores ────────────────────────────────────────────
  state.lrsScanAge += 1
  for (const entry of Object.values(state.exploredQuadrants)) {
    entry.age += 1
  }
  for (const entry of Object.values(state.lrsScan)) {
    entry.age += 1
  }

  return { arrivedQuadrant, interrupted, probeResolved, probeScan, events }
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
