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
  HULL_INTEGRITY_MAX,
  STARBASE_HULL_DAMAGE_DIVISOR,
  STARBASE_POOL_CAPACITY,
  STARBASE_POOL_REGEN,
  STARBASE_TORPEDO_REPLENISH,
  TORPEDO_STOCK_MAX,
  clamp,
  liveKbsCode,
} from '@/engine/constants'
import {
  SectorEntityType,
  type GameState,
  type GridCoord,
  type SectorEntity,
  type Starbase,
  type StarbaseType,
} from '@/types/game'
import { cellKey, isAdjacent, isEnemyType, isStarbaseType } from '@/engine/sector'

/**
 * Conversão de "recurso genérico do pool" pro que a base entrega. Calibrado
 * pro pool cheio (500) cobrir um reabastecimento total (12 torpedos = 120 +
 * casco cheio = 150) e ainda sobrar pros ticks de reparo (25/subsistema,
 * decisão #8).
 *
 * ponytail: números de playtest, mesmo tratamento dos outros baselines desta
 * mudança — são o knob de calibração do "spam de docking rende menos".
 */
export const POOL_COST_PER_TORPEDO = 10
/**
 * Custo de pool por ponto de casco reformado. Antes era `0.05` por unidade de
 * energia (escala 0-3000); casco é 0-100, então a escala mudou: `1.5` deixa uma
 * reforma completa de casco (100 pts) custando 150 do pool, mesma ordem de
 * grandeza do reabastecimento total de torpedo (12 × 10 = 120).
 */
export const POOL_COST_PER_HULL = 1.5

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
  /** Pontos de integridade de CASCO reformados (só `STARBASE_DOCK`). */
  hullRestored: number
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
  | 'hullIntegrity'
  | 'shieldEnergy'
  | 'shieldsRaised'
  | 'shieldDamageTaken'
  | 'manualOverload'
  | 'torpedoStock'
  | 'brig'
  | 'teams'
  | 'hostileDockWarningShown'
>

/**
 * Entidade de starbase adjacente ao setor da nave, ou `null`. Adjacência é
 * Chebyshev ≤ 1 (as 8 vizinhas), o mesmo padrão do Send Party (decisão #23).
 */
export function findAdjacentStarbase(state: DockState): SectorEntity | null {
  return (
    state.currentSector.find(
      (entity) =>
        isStarbaseType(entity.type) &&
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
  return state.currentSector.some((entity) => isEnemyType(entity.type))
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
    hullRestored: 0,
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

  // Porto seguro: escudos descem (deixam de taxar o orçamento) e o núcleo
  // esfria. Desliga só a EMISSÃO — a alocação (`shieldEnergy`) fica guardada
  // pra quando erguer de novo no undock (`shield-power-model`).
  state.shieldsRaised = false
  state.manualOverload = 0
  // A estação repara o que a tripulação não consegue: o dano acumulado no
  // escudo zera aqui. Sem isto, a regeneração em voo (proporcional à energia
  // mantida) seria a única via, e uma campanha longa acumularia um resíduo que
  // nunca sai.
  state.shieldDamageTaken = 0

  const { torpedoes, hull: hullRepair, spent } = resupply(
    state,
    baseType,
    pool,
    record?.torpedoStock ?? 0,
  )
  state.torpedoStock += torpedoes
  state.hullIntegrity = clamp(state.hullIntegrity + hullRepair, 0, HULL_INTEGRITY_MAX)
  if (record) {
    record.resourcePool = clamp(pool - spent, 0, STARBASE_POOL_CAPACITY)
    // Estoque PRÓPRIO da base — sacado aqui, reposto por turno
    // (`regenStarbasePools`, `starbase-resilience`).
    record.torpedoStock = Math.max(0, record.torpedoStock - torpedoes)
  }

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
    hullRestored: hullRepair,
    prisonersTransferred,
    guardTeamsReleased,
    poolSpent: spent,
    poolRemaining: record?.resourcePool ?? 0,
    hostileWarning,
  }
}

/**
 * Resupply instantâneo por tipo de base, limitado pelo pool E pelo estoque de
 * torpedo PRÓPRIO da base: `DOCK` repõe torpedos E casco, `SUPPLY` só
 * torpedos, `SCIENCE` nada (só confirmação de suporte vital). Pool ou estoque
 * insuficiente entrega proporcionalmente menos.
 *
 * Antes só o pool limitava — a base "tinha" torpedo infinito contanto que o
 * pool cobrisse o custo. Com estoque próprio (`starbase-resilience`, item
 * 27.6), uma base espremida por resupplies repetidos pode ficar sem torpedo
 * pra dar mesmo com pool cheio.
 */
function resupply(
  state: DockState,
  baseType: StarbaseType,
  pool: number,
  baseTorpedoStock: number,
): { torpedoes: number; hull: number; spent: number } {
  const none = { torpedoes: 0, hull: 0, spent: 0 }
  if (baseType === SectorEntityType.STARBASE_SCIENCE) return none

  const wantedTorpedoes = Math.min(
    Math.max(0, TORPEDO_STOCK_MAX - state.torpedoStock),
    Math.max(0, baseTorpedoStock),
  )
  // Só a doca reforma casco; depósito de suprimentos só repõe torpedo.
  const wantedHull =
    baseType === SectorEntityType.STARBASE_DOCK
      ? Math.max(0, HULL_INTEGRITY_MAX - state.hullIntegrity)
      : 0

  const fullCost =
    wantedTorpedoes * POOL_COST_PER_TORPEDO + wantedHull * POOL_COST_PER_HULL
  if (fullCost === 0) return none

  const factor = fullCost > pool ? pool / fullCost : 1
  const torpedoes = Math.floor(wantedTorpedoes * factor)
  const hull = Math.floor(wantedHull * factor)
  return {
    torpedoes,
    hull,
    spent: torpedoes * POOL_COST_PER_TORPEDO + hull * POOL_COST_PER_HULL,
  }
}

/** Desatracar é livre, sem custo de turno (decisão #23). */
export function undock(
  state: Pick<DockState, 'docked' | 'dockedBaseId' | 'position' | 'currentSector'>,
): void {
  const base = state.currentSector.find(
    (e) => isStarbaseType(e.type) && isAdjacent(e.position, state.position.sector),
  )

  state.docked = false
  state.dockedBaseId = null
  if (!base) return

  // Recolocar a nave AO LADO da base. `undock` só limpava dois flags e nunca
  // moveu nada — o item 9.5 do roteiro descrevia comportamento que não
  // existia. Direção fixa ("a sudoeste") quebra com a base na borda do setor,
  // que foi exatamente o caso que a 4ª rodada encontrou; procurar entre as
  // adjacentes livres resolve sem caso especial.
  const taken = new Set(state.currentSector.map((e) => cellKey(e.position)))
  const candidates: GridCoord[] = []
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue
      const cell = { row: base.position.row + dRow, col: base.position.col + dCol }
      if (cell.row < 1 || cell.row > 8 || cell.col < 1 || cell.col > 8) continue
      if (!taken.has(cellKey(cell))) candidates.push(cell)
    }
  }
  if (candidates.length > 0) {
    state.position.sector = candidates[0]
    return
  }

  // Vizinhança lotada: a célula livre mais próxima da base serve. Sobrepor a
  // nave numa entidade seria pior que andar um pouco mais.
  let best: GridCoord | null = null
  let bestDist = Infinity
  for (let row = 1; row <= 8; row++) {
    for (let col = 1; col <= 8; col++) {
      if (taken.has(cellKey({ row, col }))) continue
      const dist = Math.max(
        Math.abs(row - base.position.row),
        Math.abs(col - base.position.col),
      )
      if (dist < bestDist) {
        bestDist = dist
        best = { row, col }
      }
    }
  }
  if (best) state.position.sector = best
}

/**
 * Regen de pool E de estoque de torpedo por turno, em toda base viva, exceto
 * a que está sendo sacada por um loop de docking ativo. Chamado pelo
 * `turnEngine`. Torpedo repõe até `torpedoCapacity` PRÓPRIO da base — nunca
 * acima do que ela nasceu com (`starbase-resilience`, item 27.6).
 */
export function regenStarbasePools(bases: Starbase[], activeBaseId: string | null = null): void {
  for (const base of bases) {
    if (base.destroyed || base.id === activeBaseId) continue
    base.resourcePool = clamp(
      base.resourcePool + STARBASE_POOL_REGEN,
      0,
      STARBASE_POOL_CAPACITY,
    )
    const replenish = STARBASE_TORPEDO_REPLENISH[base.type] ?? 0
    if (replenish > 0) {
      base.torpedoStock = clamp(base.torpedoStock + replenish, 0, base.torpedoCapacity)
    }
  }
}

/** Resultado de um golpe absorvido pela base — espelha o par escudo/casco da nave. */
export interface StarbaseDamageResult {
  shieldAbsorbed: number
  hullLoss: number
  destroyed: boolean
  /**
   * `true` quando a base atingida NÃO é a que a nave está atracada — dispara
   * SOS. A que a nave está atracada nunca soa SOS: somos a única nave aliada
   * da galáxia, não faz sentido pedir socorro a si mesma.
   */
  sos: boolean
}

/** Fatia lida/mutada pelo broadcast de SOS. */
type SosState = Pick<GameState, 'galaxy' | 'exploredQuadrants' | 'lrsScan'>

/**
 * Aplica dano a uma base: escudo absorve primeiro (não regenera), o excedente
 * vira perda de hull na escala PRÓPRIA da base — mesmo split hull/escudo da
 * nave, só que com constantes de base (`STARBASE_HULL_DAMAGE_DIVISOR`), não
 * as da nave (`starbase-resilience`, item 27.6: "pool de 500 é hull E
 * almoxarifado ao mesmo tempo").
 *
 * Único caminho hoje é o dano redirecionado à base ATRACADA
 * (`turnEngine.resolveEnemyTurn`), que por definição nunca soa SOS. A função
 * já cobre o caso de uma base diferente ser atingida — pronta pro dia em que
 * a IA passar a atacar base independente da nave (ainda não ataca, 03/08).
 */
export function applyStarbaseDamage(
  state: SosState & Pick<GameState, 'dockedBaseId'>,
  base: Starbase,
  amount: number,
): StarbaseDamageResult {
  const shieldAbsorbed = Math.min(base.shieldPoints, amount)
  base.shieldPoints -= shieldAbsorbed
  const remainder = amount - shieldAbsorbed
  const hullLoss = remainder / STARBASE_HULL_DAMAGE_DIVISOR
  base.hullIntegrity = Math.max(0, base.hullIntegrity - hullLoss)
  const destroyed = base.hullIntegrity <= 0
  if (destroyed) base.destroyed = true

  const sos = base.id !== state.dockedBaseId
  if (sos) broadcastBaseSOS(state, base)

  return { shieldAbsorbed, hullLoss, destroyed, sos }
}

/**
 * SOS de base sob ataque: informação CONFIÁVEL — a própria base reporta sua
 * posição, então atualiza LRS e Star Chart DIRETO, mesmo padrão do datalink
 * de sonda (`navigation.resolveProbeScan`: "a sonda alimenta o LRS também,
 * não só o Star Chart"). `cellKey` (não `quadrantKey` de `worldGen`, que
 * criaria import entre irmãos) — mesmo formato `"row,col"`, domínio-agnóstico.
 */
function broadcastBaseSOS(state: SosState, base: Starbase): void {
  const key = cellKey(base.quadrant)
  const content = state.galaxy[key]
  if (!content) return
  const code = liveKbsCode(content)
  state.exploredQuadrants[key] = { code, age: 0 }
  state.lrsScan[key] = { code, age: 0 }
}
