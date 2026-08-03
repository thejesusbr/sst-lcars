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
  ENEMY_TYPES,
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
  ENEMY_ENERGY_MAX,
  ENEMY_POWER_BAND,
  ENEMY_SHIELD_BAND,
  ENEMY_TYPE_WEIGHTS,
  missionDurationFor,
  STARBASE_HULL_MAX,
  STARBASE_POOL_CAPACITY,
  STARBASE_SHIELD_INITIAL,
  STARBASE_TORPEDO_BASE,
  STARBASE_TORPEDO_RANGE,
  STARDATE_INITIAL,
} from './constants'
import { mulberry32 } from './prng'

/**
 * Sorteio ponderado do tipo de inimigo (`ENEMY_TYPE_WEIGHTS`, `enemy-species`).
 * Peso fixo, não região — território é pendência futura (`openspec/BACKLOG.md`).
 */
function pickEnemyType(rng: () => number): (typeof ENEMY_TYPES)[number] {
  const roll = rng()
  let acc = 0
  for (const type of ENEMY_TYPES) {
    acc += ENEMY_TYPE_WEIGHTS[type] ?? 0
    if (roll < acc) return type
  }
  return ENEMY_TYPES[ENEMY_TYPES.length - 1]
}

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

/**
 * Quantos dos `klingons` de um quadrante nascem Cloaked Raider — decidido
 * agora (geração eager) via materialização de PREVIEW, pra `liveKbsCode`
 * saber quanto esconder do dígito K sem esperar a visita real
 * (`cloak-and-alert`, 20.7).
 *
 * A preview usa a MESMA semente e as MESMAS regras de `materializeSector`
 * (`content.klingons`/`clearedEnemies` são as únicas entradas que o laço de
 * inimigo lê antes de tocar em base/planeta/estrela), então bate byte a byte
 * com o que a materialização REAL vai sortear quando o jogador chegar —
 * mesmo truque que `pickStartPosition` já usa pra prever ocupação.
 */
function countCloakedRaiders(klingons: number, quadrant: GridCoord, seed: number): number {
  if (klingons === 0) return 0
  const preview = materializeSector(
    {
      klingons,
      baseIds: [],
      stars: 0,
      planet: false,
      dilithiumCharges: 0,
      surveyed: false,
      clearedEnemies: 0,
    },
    quadrant,
    seed,
  )
  return preview.filter((e) => e.type === SectorEntityType.CLOAKED_RAIDER).length
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
        cloakedRaiders: countCloakedRaiders(klingons, { row, col }, seed),
      }
      galaxy[`${row},${col}`] = content

      if (hasBase) {
        placeBase(galaxy, starbases, { row, col }, randomBaseType(rng), rng)
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

  // O relógio SEGUE a frota: base fixa + termo por inimigo. Relógio constante
  // fazia a dificuldade oscilar 1.7x por sorteio, antes de o jogador agir.
  //
  // A salvaguarda da própria fonte (`IFK9>T9THENT9=K9+1`) continua, agora como
  // o piso que ela sempre foi — com o relógio escalando junto, ela deixa de ser
  // o único freio da cauda azarada.
  const duration = Math.max(missionDurationFor(enemyTotal), enemyTotal + 1)

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

/**
 * Estoque de torpedo inicial da base: `STARBASE_TORPEDO_BASE + rng(min-max)`
 * do próprio tipo, ou 0 pra tipo sem faixa (Science — mesma exclusão do
 * resupply de torpedo pra nave, `starbase-resilience`).
 */
function rollTorpedoCapacity(type: StarbaseType, rng: () => number): number {
  const range = STARBASE_TORPEDO_RANGE[type]
  if (!range) return 0
  const [lo, hi] = range
  return STARBASE_TORPEDO_BASE + Math.floor(lo + rng() * (hi - lo + 1))
}

function placeBase(
  galaxy: GalaxyMap,
  starbases: Starbase[],
  quadrant: GridCoord,
  type: StarbaseType,
  rng: () => number,
): void {
  const torpedoCapacity = rollTorpedoCapacity(type, rng)
  const base: Starbase = {
    id: `base-${starbases.length + 1}`,
    type,
    quadrant,
    sector: { row: 0, col: 0 }, // definido na materialização do setor
    resourcePool: STARBASE_POOL_CAPACITY,
    hullIntegrity: STARBASE_HULL_MAX,
    shieldPoints: STARBASE_SHIELD_INITIAL,
    torpedoStock: torpedoCapacity,
    torpedoCapacity,
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
  placeBase(galaxy, starbases, { row, col }, type, rng)
}

// ── Posição inicial ─────────────────────────────────────────────────────────

/**
 * Quadrante/setor iniciais sorteados, com a célula garantidamente livre e o
 * quadrante garantidamente sem hostil. A posição fixa 4,4/4,4 anterior só era
 * segura porque o mundo era vazio (decisão 5).
 *
 * Antes só a CÉLULA era garantida livre — o quadrante em si podia ter 1-3
 * Klingons, e a partida começava sob ataque por sorte pura (6ª rodada, "Obs.
 * geral: destruída no turno 1"). Reforçar aqui, não escalonar o combate
 * (`ENEMY_ATTACKERS_PER_TURN`), porque o problema era 0 turnos de decisão
 * antes do 1º tiro, não o número de atacantes por turno.
 */
export function pickStartPosition(
  galaxy: GalaxyMap,
  seed: number,
  rng: () => number,
  starbases: Starbase[] = [],
): { quadrant: GridCoord; sector: GridCoord } {
  let quadrant = rollCoord(rng)
  let content = galaxy[quadrantKey(quadrant)]
  let guardQ = 0
  while (content.klingons > 0 && guardQ++ < 256) {
    quadrant = rollCoord(rng)
    content = galaxy[quadrantKey(quadrant)]
  }
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
    const type = pickEnemyType(rng)
    // Escudo e poder absorvem/atacam por faixa própria do tipo (`enemy-species`).
    const [shieldLo, shieldHi] = ENEMY_SHIELD_BAND[type] ?? [0.5, 1.0]
    const [powerLo, powerHi] = ENEMY_POWER_BAND[type] ?? [0.5, 1.5]
    entities.push({
      id: `${qk}-k-${i}`,
      type,
      position: freeCell(),
      enemyPower: ENEMY_BASE_POWER * (powerLo + rng() * (powerHi - powerLo)),
      enemyShield: ENEMY_BASE_POWER * (shieldLo + rng() * (shieldHi - shieldLo)),
      enemyEnergy: ENEMY_ENERGY_MAX,
      // Único tipo cujo peso também compra uma habilidade: nasce cloacado,
      // sujeito às mesmas regras de estresse/cooldown de todo Cloaked Raider.
      ...(type === SectorEntityType.CLOAKED_RAIDER
        ? { cloaked: true, cloakStress: 0 }
        : {}),
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

/**
 * Cloaked Raider tenta se aproximar da nave sem ser visto, pra atacar com
 * máxima efetividade quando decloacar — revisão do usuário (20.7):
 * "Quando a nave entra em um setor com Raider cloacado, ele tenta se
 * aproximar da nave sem ser visto". Reposiciona pra ADJACENTE à nave
 * (`damageFalloff(1) = 1.0`, o teto da tabela) em vez de onde `freeCell()`
 * sorteou na materialização — mesma busca por vizinha livre do `undock`
 * (`docking.ts`), pra nunca empilhar em cima de outra entidade.
 *
 * Chamado pelo hook `onQuadrantEnter` (`useGameState.ts`), DEPOIS de
 * `materializeSector` — não dentro dela, porque `pickStartPosition` também
 * chama `materializeSector` pra PREVER ocupação, e a nave "entrando" ali é só
 * previsão, não um evento real que mereça a aproximação furtiva.
 */
export function approachCloakedRaiders(
  entities: SectorEntity[],
  shipSector: GridCoord,
  rng: () => number,
): void {
  const raiders = entities.filter(
    (e) => e.type === SectorEntityType.CLOAKED_RAIDER && e.cloaked,
  )
  if (raiders.length === 0) return

  const taken = new Set(entities.map((e) => cellKey(e.position)))
  for (const raider of raiders) {
    taken.delete(cellKey(raider.position))
    const candidates: GridCoord[] = []
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue
        const cell = { row: shipSector.row + dRow, col: shipSector.col + dCol }
        if (cell.row < GRID_MIN || cell.row > GRID_MAX) continue
        if (cell.col < GRID_MIN || cell.col > GRID_MAX) continue
        if (!taken.has(cellKey(cell))) candidates.push(cell)
      }
    }
    if (candidates.length > 0) {
      raider.position = candidates[Math.floor(rng() * candidates.length)]
    }
    taken.add(cellKey(raider.position))
  }
}
