/**
 * Fábrica do `GameState` de um jogo novo — estado inicial + mundo gerado.
 *
 * Mora aqui, e não em `constants.ts`, por causa de import circular: `worldGen`
 * importa `constants` (pra `ENEMY_BASE_POWER`, `MISSION_DURATION` etc), então
 * `constants` não pode importar `worldGen`. `constants.ts` segue folha e só com
 * constantes/matemática pura; a composição fica neste módulo.
 */

import {
  GAME_SCHEMA_VERSION,
  SUBSYSTEM_KEYS,
  type DamageControlTeam,
  type GameState,
  type SubsystemIntegrity,
} from '@/types/game'
import {
  BRIG_CAPACITY,
  DAMAGE_CONTROL_TEAM_COUNT,
  MAIN_ENERGY_INITIAL,
  PHASER_POWER_MAX,
  PHASER_TEMP_INITIAL,
  PROBES_INITIAL,
  SHIELD_ENERGY_INITIAL,
  STARDATE_INITIAL,
  TORPEDO_STOCK_INITIAL,
  TORPEDO_TUBE_COUNT,
} from './constants'
import { randomSeed } from './prng'
import { generateWorld, kbsCode, materializeSector, quadrantKey } from './worldGen'

const TEAM_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'] as const

function createInitialSubsystems(): SubsystemIntegrity {
  return Object.fromEntries(
    SUBSYSTEM_KEYS.map((key) => [key, 100]),
  ) as SubsystemIntegrity
}

function createInitialTeams(): DamageControlTeam[] {
  return TEAM_NAMES.slice(0, DAMAGE_CONTROL_TEAM_COUNT).map((name, i) => ({
    id: `team-${i + 1}`,
    name,
    efficiency: 100,
    assignedSystem: null,
    status: 'idle',
    turnsWorked: 0,
  }))
}

/**
 * Cria o estado de um jogo novo, com galáxia gerada. `enemiesLeft` e
 * `starbasesLeft` vêm da geração, não de constante (world-generation design.md
 * decisão 1). Passar `seed` reproduz exatamente a mesma partida.
 */
export function createNewGameState(seed: number = randomSeed()): GameState {
  const world = generateWorld(seed)
  const startKey = quadrantKey(world.position.quadrant)
  const startContent = world.galaxy[startKey]

  return {
    schemaVersion: GAME_SCHEMA_VERSION,
    mode: 'briefing',
    result: null,
    seed,
    galaxy: world.galaxy,

    stardate: STARDATE_INITIAL,
    stardateLimit: world.stardateLimit,
    enemiesLeft: world.enemyTotal,
    starbasesLeft: world.starbases.filter((b) => !b.destroyed).length,

    position: world.position,
    destination: null,

    mainEnergy: MAIN_ENERGY_INITIAL,
    shieldEnergy: SHIELD_ENERGY_INITIAL,
    shieldDamageTaken: 0,
    impulsePower: 50,
    phaserPower: PHASER_POWER_MAX / 2,

    // Setor inicial já materializado: o jogo começa jogável, não num vazio.
    currentSector: materializeSector(
      startContent,
      world.position.quadrant,
      seed,
      world.starbases,
    ),
    phaserTemp: PHASER_TEMP_INITIAL,
    torpedoStock: TORPEDO_STOCK_INITIAL,
    tubes: Array.from({ length: TORPEDO_TUBE_COUNT }, (_, i) => ({
      id: i + 1,
      targetId: null,
      loaded: false,
      autoLoad: false,
    })),
    weaponsLocked: false,
    klingonsDestroyed: 0,
    klingonsCaptured: 0,
    torpedoesUsed: 0,

    brig: { count: 0, capacity: BRIG_CAPACITY },

    subsystems: createInitialSubsystems(),
    teams: createInitialTeams(),
    lifeSupportTurnsRemaining: null,

    manualOverload: 0,
    breach: { active: false, containment: 0, turnsRemaining: 0 },
    subsystemsOn: { srs: true, lrs: true, photons: true, autoNav: false },

    warpFactor: 2,
    warpTrip: null,
    boostActive: false,
    boostTurnsUsed: 0,
    boostCooldown: 0,
    docked: false,
    dockedBaseId: null,
    hostileDockWarningShown: false,

    starbases: world.starbases,
    // A nave obviamente sabe onde está: quadrante inicial já explorado.
    exploredQuadrants: {
      [startKey]: { code: kbsCode(startContent), age: 0 },
    },
    lrsScan: {},
    lrsScanAge: 0,
    remainingProbes: PROBES_INITIAL,
    probe: null,
    landingParty: null,

    redAlert: false,
    combatLog: [],
    logReadMarkers: { captain: 0, general: 0, engineering: 0 },

    tribbleInfestationActive: false,
    tribblePopulation: 0,
  }
}
