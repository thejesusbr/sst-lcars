/**
 * Damage Control: equipes de CdD, reparo por turno, stacking,
 * fadiga/recuperação, expedições de Send Party, cela/guarda e Core Breach.
 *
 * Importa SÓ de `types/game.ts` e `engine/constants.ts` (design.md decisão #36).
 * TS puro, sem Vue/Pinia.
 */

import {
  BREACH_REPAIR_PENALTY,
  DILITHIUM_WC_BOOST,
  HOSTILE_RISK_BASE,
  HOSTILE_RISK_PER_EXTRA_ENEMY,
  LANDING_PARTY_TURNS,
  TEAM_EFFICIENCY_FLOOR,
  TEAM_RECOVERY_PER_TURN,
  clamp,
} from '@/engine/constants'
import {
  SectorEntityType,
  SUBSYSTEM_KEYS,
  type GameState,
  type GridCoord,
  type SubsystemKey,
} from '@/types/game'
import { getVisibleEnemies } from '@/engine/combat'

/** Multiplicadores por posição de pilha de equipes no mesmo subsistema. */
export const STACKING_MULTIPLIERS = [1, 1, 0.5, 0.25, 0.125, 0.0625] as const

// ── Brig & Guarda ───────────────────────────────────────────────────────────

/**
 * Garante o requisito de guarda de prisioneiros:
 * - Se `brig.count >= 1`, exatamente 1 equipe de CdD é travada em `'guard'`.
 * - Se `brig.count === 0`, qualquer equipe em `'guard'` é liberada para `'idle'`.
 */
export function syncBrigGuard(state: GameState): void {
  const guardTeam = state.teams.find((t) => t.status === 'guard')

  if (state.brig.count > 0 && !guardTeam) {
    // Escolhe uma equipe livre ou com menor prioridade para a guarda
    const candidate =
      state.teams.find((t) => t.status === 'idle') ??
      state.teams.find((t) => t.status === 'working') ??
      state.teams.find((t) => t.status === 'cooldown')

    if (candidate) {
      candidate.status = 'guard'
      candidate.assignedSystem = null
    }
  } else if (state.brig.count === 0 && guardTeam) {
    guardTeam.status = 'idle'
  }
}

// ── Dispatch e Recall Livres (sem custo de turno) ───────────────────────────

export interface DispatchResult {
  success: boolean
  reason?: 'in_cooldown' | 'in_guard' | 'away' | 'invalid_team'
}

/**
 * Envia uma equipe de CdD para um subsistema.
 * - Dispatch é livre (não consome turno), mas o reparo e fadiga só contam a partir
 *   da próxima resolução de turno.
 * - Rejeita se a equipe estiver em `cooldown`, `guard` ou `away`.
 */
export function dispatchTeam(
  state: GameState,
  teamId: string,
  system: SubsystemKey
): DispatchResult {
  const team = state.teams.find((t) => t.id === teamId)
  if (!team) return { success: false, reason: 'invalid_team' }
  if (team.status === 'cooldown') return { success: false, reason: 'in_cooldown' }
  if (team.status === 'guard') return { success: false, reason: 'in_guard' }
  if (team.status === 'away') return { success: false, reason: 'away' }

  team.status = 'working'
  team.assignedSystem = system
  return { success: true }
}

/**
 * Revoca uma equipe de CdD do subsistema em que estava trabalhando.
 * - Se a equipe parou no piso de eficiência (`<= 20%`), entra em `'cooldown'`.
 * - Caso contrário, volta diretamente para `'idle'`.
 */
export function recallTeam(state: GameState, teamId: string): DispatchResult {
  const team = state.teams.find((t) => t.id === teamId)
  if (!team) return { success: false, reason: 'invalid_team' }
  if (team.status === 'guard') return { success: false, reason: 'in_guard' }
  if (team.status === 'away') return { success: false, reason: 'away' }

  const exhausted = team.efficiency <= TEAM_EFFICIENCY_FLOOR
  team.status = exhausted ? 'cooldown' : 'idle'
  team.assignedSystem = null
  return { success: true }
}

// ── Fórmula de Taxa de Reparo ───────────────────────────────────────────────

/**
 * Calcula a taxa de reparo por turno para um subsistema específico:
 * `repairPerTurn = 5 * tier * Σ(efficiency_i / 100 * stackMult_i)`
 * onde tier = 5 em doca ou durante breach ativo, ou tier = 3 em espaço normal.
 */
export function calculateRepairRate(
  state: GameState,
  system: SubsystemKey
): number {
  const assignedTeams = state.teams.filter(
    (t) => t.status === 'working' && t.assignedSystem === system
  )
  if (assignedTeams.length === 0) return 0

  const tier =
    state.docked || (state.breach.active && system === 'warpCore') ? 5 : 3

  let sumEfficiency = 0
  assignedTeams.forEach((team, idx) => {
    const mult = STACKING_MULTIPLIERS[idx] ?? 0.0625
    sumEfficiency += (team.efficiency / 100) * mult
  })

  let rawRate = 5 * tier * sumEfficiency
  // Penalidade se houver breach ativo e o subsistema não for warpCore
  if (state.breach.active && system !== 'warpCore') {
    rawRate *= BREACH_REPAIR_PENALTY
  }

  return rawRate
}

// ── Resolução de Turno (Fadiga, Recuperação e Reparos) ──────────────────────

export interface DamageControlTurnResult {
  repairs: Record<SubsystemKey, number>
  breachContained: boolean
}

/**
 * Resolve 1 turno de Controle de Danos:
 * - Aplica os reparos calculados a cada subsistema.
 * - Atualiza a contenção de Radiation Breach, se ativo.
 * - Atualiza a fadiga de equipes trabalhando ou a recuperação de equipes idle/cooldown.
 */
export function resolveDamageControlTurn(
  state: GameState
): DamageControlTurnResult {
  syncBrigGuard(state)

  const repairs = {} as Record<SubsystemKey, number>
  for (const sys of SUBSYSTEM_KEYS) {
    const rate = calculateRepairRate(state, sys)
    const amount = Math.round(rate)
    repairs[sys] = amount

    if (amount > 0) {
      const current = state.subsystems[sys]
      state.subsystems[sys] = clamp(current + amount, 0, 100)
    }
  }

  // Se o Core Breach estiver ativo, equipes em 'warpCore' progridem na contenção
  let breachContained = false
  if (state.breach.active) {
    const coreRepairs = repairs['warpCore'] ?? 0
    state.breach.containment = clamp(state.breach.containment + coreRepairs, 0, 100)
    if (state.breach.containment >= 100) {
      state.breach.active = false
      breachContained = true
    } else {
      state.breach.turnsRemaining = Math.max(0, state.breach.turnsRemaining - 1)
    }
  }

  // Atualização de fadiga e recuperação das equipes
  for (const team of state.teams) {
    if (team.status === 'working') {
      team.turnsWorked++
      const rawEff = Math.round(100 * Math.pow(0.5, team.turnsWorked / 3))
      team.efficiency = Math.max(TEAM_EFFICIENCY_FLOOR, rawEff)
    } else if (team.status === 'idle' || team.status === 'cooldown') {
      if (team.turnsWorked > 0) {
        team.turnsWorked = Math.max(0, team.turnsWorked - 1)
      }
      team.efficiency = Math.min(100, team.efficiency + TEAM_RECOVERY_PER_TURN)
      if (team.status === 'cooldown' && team.efficiency >= 50) {
        team.status = 'idle'
      }
    }
  }

  return { repairs, breachContained }
}

// ── Send Party (Missão de 3 Turnos em Planeta Adjacente) ────────────────────

export interface SendPartyResult {
  success: boolean
  reason?: 'no_planet' | 'no_team' | 'mission_active'
}

/**
 * Envia uma equipe para planeta adjacente por 3 turnos para minerar dilithium
 * e conceder +30 de integridade ao Warp Core.
 */
export function sendParty(
  state: GameState,
  teamId: string,
  targetSector: GridCoord
): SendPartyResult {
  if (state.landingParty) {
    return { success: false, reason: 'mission_active' }
  }

  // Valida se há um planeta no setor alvo e se está adjacente à nave (Chebyshev <= 1)
  const isAdjacent =
    Math.max(
      Math.abs(state.position.sector.row - targetSector.row),
      Math.abs(state.position.sector.col - targetSector.col)
    ) <= 1

  const hasPlanet = state.currentSector.some(
    (e) =>
      e.type === 'planet' &&
      e.position.row === targetSector.row &&
      e.position.col === targetSector.col
  )

  if (!isAdjacent || !hasPlanet) {
    return { success: false, reason: 'no_planet' }
  }

  const team = state.teams.find((t) => t.id === teamId)
  if (!team || (team.status !== 'idle' && team.status !== 'working')) {
    return { success: false, reason: 'no_team' }
  }

  team.status = 'away'
  team.assignedSystem = null
  state.landingParty = {
    targetSector,
    turnsRemaining: LANDING_PARTY_TURNS,
    teamId,
  }

  return { success: true }
}

/**
 * Resolve o avanço de turno para missões de Landing Party / Send Party.
 */
export function resolveLandingPartyTurn(
  state: GameState,
  rng = Math.random
): { completed: boolean; destroyed: boolean; boost: number } {
  if (!state.landingParty) {
    return { completed: false, destroyed: false, boost: 0 }
  }

  state.landingParty.turnsRemaining--
  if (state.landingParty.turnsRemaining > 0) {
    return { completed: false, destroyed: false, boost: 0 }
  }

  const { teamId } = state.landingParty
  const team = state.teams.find((t) => t.id === teamId)
  state.landingParty = null

  // Risco em setor hostil: base 40% + 5% / inimigo adicional
  const enemies = getVisibleEnemies(state)
  if (enemies.length > 0) {
    const risk =
      HOSTILE_RISK_BASE +
      Math.max(0, enemies.length - 1) * HOSTILE_RISK_PER_EXTRA_ENEMY
    if (rng() < risk) {
      if (team) {
        // Equipe destruída é recriada ou travada com eficiência mínima
        team.efficiency = TEAM_EFFICIENCY_FLOOR
        team.status = 'cooldown'
      }
      return { completed: true, destroyed: true, boost: 0 }
    }
  }

  if (team) {
    team.status = 'idle'
  }

  // A missão sobreviveu, mas o rendimento é CONDICIONAL: ~70% dos planetas são
  // estéreis, e o jogador não tinha como saber antes de ir (world-generation
  // design.md decisão 7). Pesquisar revela o conteúdo de qualquer forma.
  const planet = state.currentSector.find(
    (e) => e.type === SectorEntityType.PLANET
  )
  if (planet) planet.surveyed = true

  const quadrant = state.galaxy?.[quadrantKeyOf(state)]
  if (quadrant) quadrant.surveyed = true

  const charges = planet?.dilithiumCharges ?? 0
  if (charges <= 0) {
    // Planeta estéril: turnos e risco gastos, nenhum reparo.
    return { completed: true, destroyed: false, boost: 0 }
  }

  // Consome exatamente 1 carga — planeta de 3 cargas suporta 3 missões.
  planet!.dilithiumCharges = charges - 1
  if (quadrant) quadrant.dilithiumCharges = charges - 1

  state.subsystems.warpCore = clamp(
    state.subsystems.warpCore + DILITHIUM_WC_BOOST,
    0,
    100
  )

  return {
    completed: true,
    destroyed: false,
    boost: DILITHIUM_WC_BOOST,
  }
}

/** Chave `"row,col"` do quadrante atual, pra indexar `state.galaxy`. */
function quadrantKeyOf(state: GameState): string {
  return `${state.position.quadrant.row},${state.position.quadrant.col}`
}
