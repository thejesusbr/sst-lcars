/**
 * Docking: primitivos independentes da atracagem (specs `docking`).
 *
 * Importa SÓ de `types/game.ts` e `engine/constants.ts` — nunca de outro
 * `engine/*.ts` (design.md decisão #36). Puro, sem Vue/Pinia.
 *
 * **Fora de escopo aqui**: o loop de reparo multi-turno do `STARBASE_DOCK`
 * (decisão #8) — depende do modo docking do `turnEngine` (Fase C, task 3.2).
 * Este arquivo cobre só o que acontece de graça, no instante da atracagem:
 * elegibilidade, resupply, baixar escudos, zerar overload, entregar
 * prisioneiros e sacar do pool da base.
 */

import {
  MAIN_ENERGY_INITIAL,
  STARBASE_POOL_CAPACITY,
  STARBASE_POOL_REGEN,
  TORPEDO_STOCK_MAX,
  WARP_CORE_OUTPUT,
  clamp,
} from '@/engine/constants'
import {
  ENEMY_TYPES,
  SectorEntityType,
  STARBASE_TYPES,
  type GameState,
  type SectorEntity,
  type Starbase,
  type StarbaseType,
} from '@/types/game'

/**
 * Conversão de "recurso genérico do pool" pro que a base entrega. Calibrado
 * pro pool cheio (500) cobrir um reabastecimento total (12 torpedos = 120 +
 * 3000 de energia = 150) e ainda sobrar pros ticks de reparo (25/subsistema,
 * decisão #8).
 *
 * ponytail: números de playtest, mesmo tratamento dos outros baselines desta
 * mudança — são o knob de calibração do "spam de docking rende menos".
 */
export const POOL_COST_PER_TORPEDO = 10
export const POOL_COST_PER_ENERGY = 0.05

/** Motivo de recusa; `null` quando a atracagem aconteceu. */
export type DockRejection = 'no-adjacent-base'

/**
 * Evento `dock-complete`: um único resultado que Engineering/Shield/Weapons
 * consomem, em vez de 3 ações manuais separadas (spec "Single dock-complete
 * event").
 */
export interface DockResult {
  docked: boolean
  rejection: DockRejection | null
  baseId: string | null
  baseType: StarbaseType | null
  torpedoesRestored: number
  energyRestored: number
  prisonersTransferred: number
  guardTeamsReleased: number
  poolSpent: number
  poolRemaining: number
  /** `true` só na 1ª atracagem em setor hostil da partida. */
  hostileWarning: boolean
}

/** Fatia do `GameState` que a atracagem lê/muta. */
export type DockState = Pick<
  GameState,
  | 'position'
  | 'currentSector'
  | 'starbases'
  | 'docked'
  | 'dockedBaseId'
  | 'mainEnergy'
  | 'shieldEnergy'
  | 'manualOverload'
  | 'torpedoStock'
  | 'brig'
  | 'teams'
  | 'hostileDockWarningShown'
>

const STARBASE_TYPE_SET: ReadonlySet<string> = new Set(STARBASE_TYPES)
const ENEMY_TYPE_SET: ReadonlySet<string> = new Set(ENEMY_TYPES)

function isAdjacent(a: { row: number; col: number }, b: { row: number; col: number }): boolean {
  return Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1
}

/**
 * Entidade de starbase adjacente ao setor da nave, ou `null`. Adjacência é
 * Chebyshev ≤ 1 (as 8 vizinhas), o mesmo padrão do Send Party (decisão #23).
 */
export function findAdjacentStarbase(state: DockState): SectorEntity | null {
  return (
    state.currentSector.find(
      (entity) =>
        STARBASE_TYPE_SET.has(entity.type) &&
        isAdjacent(entity.position, state.position.sector),
    ) ?? null
  )
}

/** Botão "Dock" só habilita com base adjacente. */
export function canDock(state: DockState): boolean {
  return findAdjacentStarbase(state) !== null
}

/** Há inimigo no setor? Decide o aviso único de docking hostil. */
export function hasHostiles(state: DockState): boolean {
  return state.currentSector.some((entity) => ENEMY_TYPE_SET.has(entity.type))
}

/**
 * Registro de galáxia da base (é ele que carrega o pool persistente entre
 * visitas, decisão #8). Casa por `id` estável; cai pra coordenada porque a
 * entidade de setor e o registro de galáxia são gerados por caminhos
 * diferentes.
 */
function findStarbaseRecord(state: DockState, entity: SectorEntity): Starbase | null {
  const { quadrant } = state.position
  return (
    state.starbases.find(
      (base) =>
        !base.destroyed &&
        (base.id === entity.id ||
          (base.quadrant.row === quadrant.row &&
            base.quadrant.col === quadrant.col &&
            base.sector.row === entity.position.row &&
            base.sector.col === entity.position.col)),
    ) ?? null
  )
}

function rejected(rejection: DockRejection): DockResult {
  return {
    docked: false,
    rejection,
    baseId: null,
    baseType: null,
    torpedoesRestored: 0,
    energyRestored: 0,
    prisonersTransferred: 0,
    guardTeamsReleased: 0,
    poolSpent: 0,
    poolRemaining: 0,
    hostileWarning: false,
  }
}

/**
 * Atraca: instantâneo, sem custo de turno (o `stardate` não avança aqui — só
 * no loop de reparo do `STARBASE_DOCK`, que roda depois, na task 3.2).
 *
 * Muta `state` no lugar e devolve o evento `dock-complete`.
 */
export function dock(state: DockState): DockResult {
  const entity = findAdjacentStarbase(state)
  if (!entity) return rejected('no-adjacent-base')

  const baseType = entity.type as StarbaseType
  const record = findStarbaseRecord(state, entity)
  // ponytail: sem registro de galáxia, a base não tem pool nenhum pra sacar —
  // resupply zera mas o resto da atracagem (escudos/cela) acontece igual.
  const pool = record?.resourcePool ?? 0

  state.docked = true
  state.dockedBaseId = record?.id ?? entity.id

  // Porto seguro: escudos descem pra `mainEnergy` e o núcleo esfria, ANTES de
  // qualquer resupply (o retorno do escudo já conta como energia recuperada).
  state.mainEnergy = clamp(state.mainEnergy + state.shieldEnergy, 0, WARP_CORE_OUTPUT)
  state.shieldEnergy = 0
  state.manualOverload = 0

  const { torpedoes, energy, spent } = resupply(state, baseType, pool)
  state.torpedoStock += torpedoes
  state.mainEnergy += energy
  if (record) record.resourcePool = clamp(pool - spent, 0, STARBASE_POOL_CAPACITY)

  // Entrega de prisioneiros: qualquer tipo de base, de graça, e a equipe de
  // guarda volta pro pool no mesmo instante (decisão #24). Sem crédito extra
  // de rating — `klingonsCaptured` já foi contado na captura.
  const prisonersTransferred = state.brig.count
  state.brig.count = 0
  let guardTeamsReleased = 0
  if (prisonersTransferred > 0) {
    for (const team of state.teams) {
      if (team.status !== 'guard') continue
      team.status = 'idle'
      team.assignedSystem = null
      guardTeamsReleased++
    }
  }

  const hostileWarning = hasHostiles(state) && !state.hostileDockWarningShown
  if (hostileWarning) state.hostileDockWarningShown = true

  return {
    docked: true,
    rejection: null,
    baseId: state.dockedBaseId,
    baseType,
    torpedoesRestored: torpedoes,
    energyRestored: energy,
    prisonersTransferred,
    guardTeamsReleased,
    poolSpent: spent,
    poolRemaining: record?.resourcePool ?? 0,
    hostileWarning,
  }
}

/**
 * Resupply instantâneo por tipo de base, limitado pelo pool: `DOCK` repõe
 * torpedos E energia, `SUPPLY` só torpedos, `SCIENCE` nada (só confirmação de
 * suporte vital). Pool insuficiente entrega proporcionalmente menos.
 */
function resupply(
  state: DockState,
  baseType: StarbaseType,
  pool: number,
): { torpedoes: number; energy: number; spent: number } {
  const none = { torpedoes: 0, energy: 0, spent: 0 }
  if (baseType === SectorEntityType.STARBASE_SCIENCE) return none

  const wantedTorpedoes = Math.max(0, TORPEDO_STOCK_MAX - state.torpedoStock)
  const wantedEnergy =
    baseType === SectorEntityType.STARBASE_DOCK
      ? Math.max(0, MAIN_ENERGY_INITIAL - state.mainEnergy)
      : 0

  const fullCost =
    wantedTorpedoes * POOL_COST_PER_TORPEDO + wantedEnergy * POOL_COST_PER_ENERGY
  if (fullCost === 0) return none

  const factor = fullCost > pool ? pool / fullCost : 1
  const torpedoes = Math.floor(wantedTorpedoes * factor)
  const energy = Math.floor(wantedEnergy * factor)
  return {
    torpedoes,
    energy,
    spent: torpedoes * POOL_COST_PER_TORPEDO + energy * POOL_COST_PER_ENERGY,
  }
}

/** Desatracar é livre, sem custo de turno (decisão #23). */
export function undock(state: Pick<DockState, 'docked' | 'dockedBaseId'>): void {
  state.docked = false
  state.dockedBaseId = null
}

/**
 * Regen de pool por turno: `+10` em toda base viva, exceto a que está sendo
 * sacada por um loop de docking ativo. Chamado pelo `turnEngine`.
 */
export function regenStarbasePools(bases: Starbase[], activeBaseId: string | null = null): void {
  for (const base of bases) {
    if (base.destroyed || base.id === activeBaseId) continue
    base.resourcePool = clamp(
      base.resourcePool + STARBASE_POOL_REGEN,
      0,
      STARBASE_POOL_CAPACITY,
    )
  }
}
