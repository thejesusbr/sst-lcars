/**
 * GameState e sub-tipos — fundação da Fase 4 (engine de jogo real).
 *
 * TS puro, sem import de Vue/Pinia: o engine (`src/engine/*.ts`) consome estes
 * tipos e o store Pinia (`src/stores/useGameState.ts`) é só a camada fina em
 * cima. Ver `openspec/changes/fase-4-engine/design.md` (decisão #1).
 */

// ── Versionamento do save ───────────────────────────────────────────────────

/**
 * Versão do schema do `GameState` persistido. Bumpar ao adicionar/remover
 * campos; o checksum de integridade é calculado só sobre os campos da versão
 * corrente, depois de migrar (capability `save-integrity`).
 */
export const GAME_SCHEMA_VERSION = 1

// ── Coordenadas ─────────────────────────────────────────────────────────────

/** Coordenada 1-8 em grid 8x8 (vale tanto pra quadrante quanto pra setor). */
export interface GridCoord {
  row: number
  col: number
}

/** Posição completa da nave: quadrante na galáxia + setor dentro do quadrante. */
export interface ShipPosition {
  quadrant: GridCoord
  sector: GridCoord
}

// ── Entidades de setor ──────────────────────────────────────────────────────

/**
 * Tipos de entidade que ocupam uma célula de setor. Valores batem com
 * `ScannerEntity` (`composables/useScannerIcons.ts`) onde já existiam, pra o
 * mapeamento pro ícone ser identidade — mas declarados aqui de novo porque o
 * engine não pode importar do composable (que importa assets PNG).
 */
export const SectorEntityType = {
  KLINGON_CRUISER: 'klingon_cruiser',
  KLINGON_D7: 'klingon_d7',
  ROMULAN_WARBIRD: 'romulan_warbird',
  ROMULAN_SCOUT: 'romulan_scout',
  /** Inimigo novo, com cloak (design.md decisão #17). */
  CLOAKED_RAIDER: 'cloaked_raider',
  STARBASE_DOCK: 'starbase_dock',
  STARBASE_SUPPLY: 'starbase_supply',
  STARBASE_SCIENCE: 'starbase_science',
  KLINGON_BASE: 'klingon_base',
  PLANET: 'planet',
  STAR: 'star',
} as const

export type SectorEntityTypeValue =
  (typeof SectorEntityType)[keyof typeof SectorEntityType]

/** Os 3 tipos de base aliada (contam pra `starbasesLeft`, permitem docking). */
export const STARBASE_TYPES = [
  SectorEntityType.STARBASE_DOCK,
  SectorEntityType.STARBASE_SUPPLY,
  SectorEntityType.STARBASE_SCIENCE,
] as const

export type StarbaseType = (typeof STARBASE_TYPES)[number]

/** Tipos hostis atacáveis (KLINGON_BASE é cenário, não entra na contagem). */
export const ENEMY_TYPES = [
  SectorEntityType.KLINGON_CRUISER,
  SectorEntityType.KLINGON_D7,
  SectorEntityType.ROMULAN_WARBIRD,
  SectorEntityType.ROMULAN_SCOUT,
  SectorEntityType.CLOAKED_RAIDER,
] as const

export type EnemyType = (typeof ENEMY_TYPES)[number]

/**
 * Entidade dentro do setor atual. `id` é estável: atribuído na criação e nunca
 * reaproveitado nem reatribuído, independente da posição no array — nenhum
 * código referencia entidade por índice (capability `combat`, "Stable entity
 * identity"; design.md decisão #6).
 */
export interface SectorEntity {
  id: string
  type: SectorEntityTypeValue
  /** Posição dentro do setor 8x8. */
  position: GridCoord
  /**
   * Stat único de vida E força de ataque, só pra entidades hostis. Dano do
   * jogador reduz até 0 (destruição); o próprio ataque do inimigo também
   * consome (capability `combat`, "Enemy power is a single stat...").
   */
  enemyPower?: number
  /** `Cloaked Raider` apenas: invisível/intargetável/não-ataca enquanto true. */
  cloaked?: boolean
  /** Estresse acumulado enquanto cloacado, 0-20 (força decloak no teto). */
  cloakStress?: number
  /** Turnos restantes de cooldown antes de poder cloacar de novo. */
  cloakCooldown?: number
  /**
   * `PLANET` apenas: cargas de dilítium restantes (0-3). Cada carga vale
   * `DILITHIUM_WC_BOOST` e é consumida por 1 missão de Send Party. **Só deve
   * ser exibida ao jogador quando `surveyed` for true** — o valor existe no
   * estado desde a geração, mas é informação oculta (mecânica do EGA Trek,
   * world-generation design.md decisão 7).
   */
  dilithiumCharges?: number
  /**
   * `PLANET` apenas: se o conteúdo já foi revelado, por missão de Send Party ou
   * por sonda (a sonda revela sem consumir carga, decisão 9).
   */
  surveyed?: boolean
}

/**
 * Base aliada com pool de recursos próprio, no nível da galáxia — não só do
 * setor atual, porque o pool regenera e é lembrado entre visitas (design.md
 * decisão #8).
 */
export interface Starbase {
  id: string
  type: StarbaseType
  quadrant: GridCoord
  sector: GridCoord
  /** 0-`STARBASE_POOL_CAPACITY`; depleta ao suprir/reparar/absorver ataque. */
  resourcePool: number
  destroyed: boolean
}

// ── Subsistemas ─────────────────────────────────────────────────────────────

/**
 * Os 9 subsistemas. Ordem é a de exibição no `EngineeringConsole`: 7 nomeados
 * originais + Auto-Navigation Computer (decisão #18) + Warp Core por último
 * (capability `damage-control`).
 */
export const SUBSYSTEM_KEYS = [
  'warp',
  'srs',
  'lrs',
  'phasers',
  'photons',
  'shields',
  'life',
  'autoNav',
  'warpCore',
] as const

export type SubsystemKey = (typeof SUBSYSTEM_KEYS)[number]

/** Rótulos de exibição, fonte única pro Engineering e pro diagrama de casco. */
export const SUBSYSTEM_LABELS: Record<SubsystemKey, string> = {
  warp: 'Warp Engines',
  srs: 'Short-Range Sensors',
  lrs: 'Long-Range Sensors',
  phasers: 'Phaser Banks',
  photons: 'Photon Tubes',
  shields: 'Shield Control',
  life: 'Life Support',
  autoNav: 'Auto-Navigation Computer',
  warpCore: 'Warp Core',
}

/** Integridade 0-100 por subsistema. */
export type SubsystemIntegrity = Record<SubsystemKey, number>

// ── Equipes de Controle de Danos ────────────────────────────────────────────

export type TeamStatus = 'idle' | 'working' | 'cooldown' | 'guard' | 'away'

/**
 * Equipe de CdD. `guard` = travada na cela enquanto houver prisioneiro
 * (decisão #23); `away` = em missão de Send Party; `cooldown` = exausta no
 * piso de 20%, só volta ao pool com 50%+ (decisão #19).
 */
export interface DamageControlTeam {
  id: string
  name: string
  /** 20-100. */
  efficiency: number
  assignedSystem: SubsystemKey | null
  status: TeamStatus
  /** Turnos consecutivos trabalhando, alimenta a curva de fadiga. */
  turnsWorked: number
}

// ── Warp Core ───────────────────────────────────────────────────────────────

/** Vazamento de radiação: contenção contra relógio (seção 10.4). */
export interface RadiationBreach {
  active: boolean
  /** 0-100; chega a 100 = contido. */
  containment: number
  /** Começa em 5, decrementa por turno; 0 sem conter = derrota. */
  turnsRemaining: number
}

// ── Combat log ──────────────────────────────────────────────────────────────

export type LogCategory = 'captain' | 'general' | 'engineering'

export interface CombatLogEntry {
  stardate: number
  category: LogCategory
  text: string
}

/**
 * Quantas entradas de cada categoria o jogador já leu. Categoria fica "não
 * lida" (aba piscando) quando o total filtrado passa esse marcador. O marcador
 * só avança ao rolar até o fim com a aba ativa — abrir a aba não basta
 * (design.md decisão #27).
 */
export type LogReadMarkers = Record<LogCategory, number>

// ── Missões em andamento ────────────────────────────────────────────────────

/** Sonda lançada: viaja `distância` turnos + 1 turno de scan. */
export interface ProbeMission {
  target: GridCoord
  turnsRemaining: number
}

/** Landing party: 3 turnos fixos (ida, pesquisa, volta). */
export interface LandingPartyMission {
  targetSector: GridCoord
  turnsRemaining: number
  /** Equipe de CdD emprestada pra missão, devolvida ao pool no fim. */
  teamId: string
}

/** Viagem de warp multi-turno em andamento. */
export interface WarpTrip {
  destination: GridCoord
  /** Fator escolhido no momento do engage (1-8). */
  warpFactor: number
  turnsRemaining: number
  /** Rota do Auto-Nav; vazia = navegação manual (para curto em obstáculo). */
  route: GridCoord[]
  autoNav: boolean
}

// ── Star Chart ──────────────────────────────────────────────────────────────

/**
 * Quadrante já explorado: código KBS memorizado permanentemente + confiança
 * que decai desde o último refresh (capability `navigation`).
 */
export interface ExploredQuadrant {
  /** "KBS": klingons, bases, estrelas — 3 dígitos. */
  code: string
  /** Turnos desde o último refresh; alimenta o cálculo de confiança. */
  age: number
}

/** Chave `"row,col"` → dado do quadrante. */
export type QuadrantMap = Record<string, ExploredQuadrant>

/**
 * Conteúdo REAL de um quadrante, definido na geração da galáxia. Distinto de
 * `ExploredQuadrant`, que é o que o jogador **já descobriu** — este é a verdade
 * do mundo, aquele é o conhecimento acumulado.
 *
 * `planet`/`dilithiumCharges` ficam FORA do código KBS de propósito: o código só
 * carrega Klingons/Bases/Estrelas, e é ele que LRS e Star Chart leem — então
 * planeta é invisível a longa distância, descoberto só entrando no quadrante ou
 * por sonda (world-generation design.md decisões 8 e 9).
 */
export interface QuadrantContent {
  klingons: number
  /** Índices em `GameState.starbases` das bases neste quadrante. */
  baseIds: string[]
  /** 1-8, nunca 0 — toda célula da galáxia tem pelo menos uma estrela. */
  stars: number
  /** Se existe planeta aqui (~50% dos quadrantes). */
  planet: boolean
  /** Cargas do planeta, se houver (0-3). Informação oculta até revelada. */
  dilithiumCharges: number
  /** Se o planeta deste quadrante já foi revelado (missão ou sonda). */
  surveyed: boolean
  /** Entidades já destruídas aqui, pra não reaparecerem ao reentrar. */
  clearedEnemies: number
}

/** Grid 8x8 da galáxia, chave `"row,col"`. Gerado 1× por New Game. */
export type GalaxyMap = Record<string, QuadrantContent>

// ── Fim de jogo ─────────────────────────────────────────────────────────────

export type GameMode = 'briefing' | 'playing' | 'result'

/**
 * Motivo terminal. Ordem de prioridade (Kobayashi Maru) vive em
 * `engine/endGame.ts`, não aqui — derrota sempre supera vitória.
 */
export type EndGameReason =
  | 'victory'
  | 'warp_core_explosion'
  | 'destroyed_with_base'
  | 'radiation_death'
  | 'crew_asphyxiation'
  | 'out_of_energy'
  | 'no_starbases'
  | 'out_of_time'

export interface EndGameResult {
  reason: EndGameReason
  victory: boolean
  rating: number
}

// ── Estado completo ─────────────────────────────────────────────────────────

export interface GameState {
  schemaVersion: number
  mode: GameMode
  result: EndGameResult | null
  /**
   * Semente da geração do mundo. Persistida pra que a mesma semente reproduza a
   * mesma galáxia (`Math.random` não aceita seed, daí o PRNG próprio em
   * `engine/prng.ts`) — world-generation design.md decisão 4.
   */
  seed: number
  /** Conteúdo real dos 64 quadrantes, gerado 1× no New Game. */
  galaxy: GalaxyMap

  // Missão / tempo
  stardate: number
  stardateLimit: number
  enemiesLeft: number
  starbasesLeft: number

  // Posição
  position: ShipPosition
  /** Destino escolhido no Helm (preenchido por Star Chart/LRS/Auto-Nav). */
  destination: GridCoord | null

  // Energia
  mainEnergy: number
  shieldEnergy: number
  /**
   * Dano acumulado no defletor. `shieldIntegrity` é DERIVADA disto + de
   * `shieldEnergy` pelo engine — nunca setada direto por console/mock
   * (capability `shields`, "shieldIntegrity is derived, never raw-set").
   */
  shieldDamageTaken: number
  /** Dial 0-100% do Impulse; convertido via `IMPULSE_POWER_MAX` pro draw. */
  impulsePower: number
  phaserPower: number

  // Combate
  currentSector: SectorEntity[]
  phaserTemp: number
  torpedoStock: number
  /** Tubo → `id` de inimigo (nunca índice de array, decisão #6). */
  tubes: TorpedoTube[]
  weaponsLocked: boolean
  klingonsDestroyed: number
  klingonsCaptured: number
  torpedoesUsed: number

  // Cela de prisioneiros
  brig: {
    count: number
    capacity: number
  }

  // Subsistemas / reparo
  subsystems: SubsystemIntegrity
  teams: DamageControlTeam[]
  /**
   * Contagem regressiva de sobrevivência: setada em 5 quando Life Support
   * cruza abaixo de 40, limpa se reparada, derrota se zerar (decisão #37).
   */
  lifeSupportTurnsRemaining: number | null

  // Warp Core
  manualOverload: number
  breach: RadiationBreach
  /** Toggles livres de subsistema não-essencial (decisão #25). */
  subsystemsOn: {
    srs: boolean
    lrs: boolean
    photons: boolean
    autoNav: boolean
  }

  // Navegação
  warpFactor: number
  warpTrip: WarpTrip | null
  boostActive: boolean
  boostTurnsUsed: number
  boostCooldown: number
  docked: boolean
  dockedBaseId: string | null
  /** Aviso de docking hostil só aparece 1x por playthrough. */
  hostileDockWarningShown: boolean

  // Sensores / mapa
  starbases: Starbase[]
  exploredQuadrants: QuadrantMap
  /** 3x3 revelado pelo último LRS; sem memória própria, some ao rescanear. */
  lrsScan: QuadrantMap
  lrsScanAge: number
  remainingProbes: number
  probe: ProbeMission | null
  landingParty: LandingPartyMission | null

  // Alerta / log
  redAlert: boolean
  combatLog: CombatLogEntry[]
  logReadMarkers: LogReadMarkers

  // Easter egg (nunca exposto na UI)
  tribbleInfestationActive: boolean
  tribblePopulation: number
}

/** Tubo de torpedo: alvo por `id` estável, nullable quando sem alvo. */
export interface TorpedoTube {
  id: number
  targetId: string | null
  loaded: boolean
  autoLoad: boolean
}
