/**
 * Geração de mundo: galáxia 8x8, povoamento de setor, posição inicial.
 *
 * **Folha**: importa só de `types/game.ts`, `constants.ts` e `prng.ts` — nunca de
 * outro módulo do engine (invariante da decisão #36 da `fase-4-engine`).
 *
 * Odds de Klingon/base/estrela extraídas do BASIC de 1978
 * (`sst_original.bas` linhas 810-1040). Planetas e dilítium são mecânica desta
 * versão, inspirada no EGA Trek — não existem na fonte.
 */

import {
  SectorEntityType,
  STARBASE_TYPES,
  type GalaxyMap,
  type GridCoord,
  type QuadrantContent,
  type SectorEntity,
  type Starbase,
  type StarbaseType,
} from '@/types/game'
import {
  liveKbsCode,
  ENEMY_BASE_POWER,
  MISSION_DURATION,
  STARBASE_POOL_CAPACITY,
  STARDATE_INITIAL,
} from './constants'
import { mulberry32 } from './prng'

export const GRID_MIN = 1
export const GRID_MAX = 8

// ── Odds da fonte de 1978 ───────────────────────────────────────────────────

/** `R1>.98` → 3 Klingons; `>.95` → 2; `>.80` → 1; senão 0. */
const KLINGON_THRESHOLDS: ReadonlyArray<readonly [number, number]> = [
  [0.98, 3],
  [0.95, 2],
  [0.8, 1],
]
/** `RND>.96` → 1 starbase (4%). */
const BASE_CHANCE = 0.96
/** 2 bases garantidas, reproduzindo o `B9=2` da fonte — mas POSICIONADAS. */
const GUARANTEED_BASES = 2

// ── Odds desta versão (planetas / dilítium) ─────────────────────────────────

/** ~50% dos quadrantes têm 1 planeta, independente da contagem de estrelas. */
const PLANET_CHANCE = 0.5
/** ~30% dos planetas carregam dilítium; os outros 70% são estéreis. */
const DILITHIUM_CHANCE = 0.3
/** Planeta com dilítium tem 1-3 cargas. */
const DILITHIUM_MAX_CHARGES = 3

// ── Helpers ─────────────────────────────────────────────────────────────────

export const quadrantKey = (c: GridCoord) => `${c.row},${c.col}`

/**
 * RNG dedicado ao layout de UM quadrante, derivado da semente do mundo + as
 * coordenadas.
 *
 * Precisa ser assim, e não o RNG do chamador: o layout tem que ser **estável
 * entre visitas**. Se dependesse do estado do stream global, sair e voltar ao
 * quadrante reposicionaria estrelas e bases (elas se teleportariam), e a escolha
 * da posição inicial não teria como prever o layout real — foi exatamente o que
 * um teste pegou.
 */
export function quadrantRng(seed: number, q: GridCoord): () => number {
  // Combina semente e coordenadas num inteiro; os multiplicadores são primos
  // só pra espalhar quadrantes vizinhos em sementes bem diferentes.
  const mixed = (seed ^ (q.row * 73856093) ^ (q.col * 19349663)) >>> 0
  return mulberry32(mixed)
}

/** `FNR(1)` da fonte: `INT(rnd*7.98+1.01)` → 1..8, nunca 0. */
function rollStars(rng: () => number): number {
  return Math.floor(rng() * 7.98 + 1.01)
}

function rollKlingons(rng: () => number): number {
  const r = rng()
  for (const [threshold, count] of KLINGON_THRESHOLDS) {
    if (r > threshold) return count
  }
  return 0
}

function rollCoord(rng: () => number): GridCoord {
  return {
    row: Math.floor(rng() * GRID_MAX) + 1,
    col: Math.floor(rng() * GRID_MAX) + 1,
  }
}

/** Código KBS de um quadrante. Encoding e desconto de baixas vêm da folha. */
export function kbsCode(content: QuadrantContent): string {
  return liveKbsCode(content)
}

// ── Geração da galáxia ──────────────────────────────────────────────────────

export interface GeneratedWorld {
  galaxy: GalaxyMap
  starbases: Starbase[]
  /** Total de Klingons efetivamente gerado — vira `enemiesLeft`. */
  enemyTotal: number
  /** Limite de stardate, já com a salvaguarda do original aplicada. */
  stardateLimit: number
  position: { quadrant: GridCoord; sector: GridCoord }
}

/**
 * Gera a galáxia inteira. Totais de inimigo e base são **derivados** do sorteio,
 * não constantes — no original `K9`/`B9` acumulam das rolagens
 * (world-generation design.md decisão 1).
 */
export function generateWorld(seed: number): GeneratedWorld {
  const rng = mulberry32(seed)
  const galaxy: GalaxyMap = {}
  const starbases: Starbase[] = []
  let enemyTotal = 0

  for (let row = GRID_MIN; row <= GRID_MAX; row++) {
    for (let col = GRID_MIN; col <= GRID_MAX; col++) {
      const klingons = rollKlingons(rng)
      enemyTotal += klingons

      const stars = rollStars(rng)
      const hasBase = rng() > BASE_CHANCE

      const planet = rng() < PLANET_CHANCE
      const charged = planet && rng() < DILITHIUM_CHANCE
      const dilithiumCharges = charged
        ? 1 + Math.floor(rng() * DILITHIUM_MAX_CHARGES)
        : 0

      const content: QuadrantContent = {
        klingons,
        baseIds: [],
        stars,
        planet,
        dilithiumCharges,
        surveyed: false,
        clearedEnemies: 0,
      }
      galaxy[`${row},${col}`] = content

      if (hasBase) {
        placeBase(galaxy, starbases, { row, col }, randomBaseType(rng))
      }
    }
  }

  // 2 bases garantidas. A 1ª é SEMPRE um STARBASE_DOCK: só ele repara
  // subsistemas, e uma galáxia sem nenhum deixaria o dano permanente
  // (decisão 6).
  placeGuaranteedBase(galaxy, starbases, rng, SectorEntityType.STARBASE_DOCK)
  for (let i = 1; i < GUARANTEED_BASES; i++) {
    placeGuaranteedBase(galaxy, starbases, rng, randomBaseType(rng))
  }

  // Salvaguarda da própria fonte (`IFK9>T9THENT9=K9+1`): frota maior que o
  // relógio da missão estica o relógio. Com ~17 inimigos e 30 stardates nunca
  // dispara — protege só a cauda azarada.
  const duration = Math.max(MISSION_DURATION, enemyTotal + 1)

  return {
    galaxy,
    starbases,
    enemyTotal,
    stardateLimit: STARDATE_INITIAL + duration,
    position: pickStartPosition(galaxy, seed, rng, starbases),
  }
}

function randomBaseType(rng: () => number): StarbaseType {
  return STARBASE_TYPES[Math.floor(rng() * STARBASE_TYPES.length)]
}

function placeBase(
  galaxy: GalaxyMap,
  starbases: Starbase[],
  quadrant: GridCoord,
  type: StarbaseType,
): void {
  const base: Starbase = {
    id: `base-${starbases.length + 1}`,
    type,
    quadrant,
    sector: { row: 0, col: 0 }, // definido na materialização do setor
    resourcePool: STARBASE_POOL_CAPACITY,
    destroyed: false,
  }
  starbases.push(base)
  galaxy[quadrantKey(quadrant)].baseIds.push(base.id)
}

/** Garante base num quadrante que ainda não tem nenhuma. */
function placeGuaranteedBase(
  galaxy: GalaxyMap,
  starbases: Starbase[],
  rng: () => number,
  type: StarbaseType,
): void {
  const free = Object.keys(galaxy).filter((k) => galaxy[k].baseIds.length === 0)
  if (free.length === 0) return
  const key = free[Math.floor(rng() * free.length)]
  const [row, col] = key.split(',').map(Number)
  placeBase(galaxy, starbases, { row, col }, type)
}

// ── Posição inicial ─────────────────────────────────────────────────────────

/**
 * Quadrante/setor iniciais sorteados, com a célula garantidamente livre. A
 * posição fixa 4,4/4,4 anterior só era segura porque o mundo era vazio
 * (decisão 5).
 */
export function pickStartPosition(
  galaxy: GalaxyMap,
  seed: number,
  rng: () => number,
  starbases: Starbase[] = [],
): { quadrant: GridCoord; sector: GridCoord } {
  const quadrant = rollCoord(rng)
  const content = galaxy[quadrantKey(quadrant)]
  // Prevê o layout REAL do setor — possível porque a materialização é derivada
  // de semente+quadrante, não do stream do chamador.
  const occupied = new Set(
    materializeSector(content, quadrant, seed, starbases).map((e) =>
      cellKey(e.position),
    ),
  )
  let sector = rollCoord(rng)
  let guard = 0
  while (occupied.has(cellKey(sector)) && guard++ < 256) {
    sector = rollCoord(rng)
  }
  return { quadrant, sector }
}

const cellKey = (c: GridCoord) => `${c.row},${c.col}`

// ── Materialização de setor ─────────────────────────────────────────────────

/**
 * Cria as entidades do quadrante. Galáxia é gerada eager (1× por New Game); o
 * setor é materializado lazy, a cada entrada — mesma divisão do original, que
 * mantém `G(8,8)` pra toda a galáxia mas só monta as entidades ao chegar
 * (decisão 3).
 *
 * `id` é determinístico por quadrante+tipo+índice, então reentrar no mesmo
 * quadrante reproduz os mesmos ids. `clearedEnemies` é o que impede inimigo
 * destruído de reaparecer.
 *
 * ponytail: ids se repetem entre visitas ao mesmo quadrante. Nada hoje carrega
 * id através de troca de setor (os tubos de torpedo devem limpar o alvo na
 * transição — `engine-integration`). Se algum dia carregar, trocar por contador
 * persistido no `GameState`.
 */
export function materializeSector(
  content: QuadrantContent,
  quadrant: GridCoord,
  seed: number,
  starbases: Starbase[] = [],
): SectorEntity[] {
  const entities: SectorEntity[] = []
  const taken = new Set<string>()
  const qk = `q${quadrant.row}${quadrant.col}`
  // Layout derivado da semente + quadrante: estável entre visitas.
  const rng = quadrantRng(seed, quadrant)

  const freeCell = (): GridCoord => {
    let c = rollCoord(rng)
    let guard = 0
    while (taken.has(cellKey(c)) && guard++ < 128) c = rollCoord(rng)
    taken.add(cellKey(c))
    return c
  }

  const liveEnemies = Math.max(0, content.klingons - content.clearedEnemies)
  for (let i = 0; i < liveEnemies; i++) {
    entities.push({
      id: `${qk}-k-${i}`,
      type: SectorEntityType.KLINGON_CRUISER,
      position: freeCell(),
      enemyPower: ENEMY_BASE_POWER * (0.5 + rng()),
    })
  }

  content.baseIds.forEach((baseId, i) => {
    const base = starbases.find((b) => b.id === baseId)
    if (base?.destroyed) return
    const position = freeCell()
    if (base) base.sector = position
    entities.push({
      id: `${qk}-b-${i}`,
      type: base?.type ?? SectorEntityType.STARBASE_DOCK,
      position,
    })
  })

  if (content.planet) {
    entities.push({
      id: `${qk}-p-0`,
      type: SectorEntityType.PLANET,
      position: freeCell(),
      dilithiumCharges: content.dilithiumCharges,
      surveyed: content.surveyed,
    })
  }

  for (let i = 0; i < content.stars; i++) {
    entities.push({
      id: `${qk}-s-${i}`,
      type: SectorEntityType.STAR,
      position: freeCell(),
    })
  }

  return entities
}
