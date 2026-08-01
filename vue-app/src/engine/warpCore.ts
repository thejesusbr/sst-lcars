/**
 * Warp Core: consumo real dos 9 subsistemas (`subsystemDraw`), sobrecarga
 * efetiva e rolls de dano/explosão/breach.
 *
 * Importa SÓ de `types/game.ts` e `engine/constants.ts` — nunca de outro
 * `engine/*.ts` (design.md decisão #36). Puro, sem Vue/Pinia: todo random entra
 * por parâmetro `rng` pra o teste ser determinístico.
 */

import {
  AUTO_NAV_DRAW,
  BREACH_TURNS,
  IMPULSE_POWER_MAX,
  LIFE_SUPPORT_DRAW,
  LRS_PASSIVE_DRAW,
  OVERLOAD_MAX,
  OVERLOAD_MIN,
  OVERLOAD_PER_EXCESS,
  PHOTON_TUBE_IDLE_DRAW,
  PHOTON_TUBE_LOADED_DRAW,
  SRS_PASSIVE_DRAW,
  TORPEDO_FIRE_COST,
  WARP_CORE_DAMAGE_TABLE,
  WARP_CORE_EXPLOSION_CHANCE_TABLE,
  WARP_CORE_HOUSE_DRAW,
  clamp,
  damageFraction,
  isCritical,
} from '@/engine/constants'
import type { GameState, RadiationBreach } from '@/types/game'

/**
 * Chance de breach por turno com o WC 100% destruído. O roll é proporcional à
 * fração de dano acumulada (specs seção 10.4: "proporcional à % de dano
 * acumulado do WC", sem número fechado).
 *
 * ponytail: número de playtest, mesmo tratamento dos outros baselines desta
 * mudança — subir/descer aqui é o único knob de calibração do breach.
 */
export const BREACH_CHANCE_AT_FULL_DAMAGE = 0.05

/** Campos de `GameState` que alimentam o cálculo de consumo. */
export type DrawState = Pick<
  GameState,
  | 'impulsePower'
  | 'boostActive'
  | 'phaserPower'
  | 'shieldEnergy'
  | 'shieldsRaised'
  | 'tubes'
  | 'subsystemsOn'
  | 'subsystems'
  | 'warpTrip'
>

/**
 * O que a nave de fato FEZ neste turno. Ajustar dial é livre (decisão #21) —
 * Impulse/Phaser só consomem no turno em que houve movimento/disparo.
 */
export interface TurnActions {
  /** Turno em que a nave realmente se moveu sob impulso. */
  movedUnderImpulse?: boolean
  firedPhasers?: boolean
  torpedoesFired?: number
}

/** Consumo do Impulse: dial × teto, com boost forçando 100% e dano cortando o teto. */
function impulseDraw(state: DrawState, actions: TurnActions): number {
  if (!actions.movedUnderImpulse) return 0
  // Crítico = propulsão paralisada (capability `navigation`): não se move, não consome.
  if (isCritical(state.subsystems.warp)) return 0
  const ceiling = IMPULSE_POWER_MAX * (1 - damageFraction(state.subsystems.warp))
  const dial = state.boostActive ? 100 : clamp(state.impulsePower, 0, 100)
  return (dial / 100) * ceiling
}

/**
 * Manter escudo custa todo turno; Shield Control danificado encarece ×(1+d).
 * Emissão desligada (`shieldsRaised` false) não taxa nada — a potência
 * alocada fica guardada, não ativa (`shield-power-model`).
 */
function shieldDraw(state: DrawState): number {
  if (!state.shieldsRaised) return 0
  return state.shieldEnergy * (1 + damageFraction(state.subsystems.shields))
}

/** Tubo carregado consome 20 NO LUGAR dos 5 de standby (decisões #31/#32). */
function photonDraw(state: DrawState, actions: TurnActions): number {
  if (!state.subsystemsOn.photons) return 0
  const passive = state.tubes.reduce(
    (sum, tube) =>
      sum + (tube.loaded ? PHOTON_TUBE_LOADED_DRAW : PHOTON_TUBE_IDLE_DRAW),
    0,
  )
  return passive + (actions.torpedoesFired ?? 0) * TORPEDO_FIRE_COST
}

/** Auto-Nav só consome enquanto pilota uma viagem de fato (decisão #28). */
function autoNavDraw(state: DrawState): number {
  if (!state.warpTrip?.autoNav) return 0
  return AUTO_NAV_DRAW * (1 + damageFraction(state.subsystems.autoNav))
}

/** Soma real do consumo dos 9 subsistemas neste turno. */
export function subsystemDraw(
  state: DrawState,
  actions: TurnActions = {},
): number {
  return (
    impulseDraw(state, actions) +
    (actions.firedPhasers ? state.phaserPower : 0) +
    shieldDraw(state) +
    photonDraw(state, actions) +
    (state.subsystemsOn.srs ? SRS_PASSIVE_DRAW : 0) +
    (state.subsystemsOn.lrs ? LRS_PASSIVE_DRAW : 0) +
    LIFE_SUPPORT_DRAW +
    WARP_CORE_HOUSE_DRAW +
    autoNavDraw(state)
  )
}

/**
 * Sobrecarga automática por consumir acima do que o core CONSEGUE gerar
 * (mín. 1 quando estoura).
 *
 * `output` é obrigatório e vem de `warpCoreOutput(integridade)` — não da
 * constante nominal. Core danificado gera menos, então o mesmo consumo passa a
 * estourar: é a espiral dano → menos output → mais sobrecarga → mais dano.
 *
 * **Linear no excesso ABSOLUTO**, `ceil(excesso / OVERLOAD_PER_EXCESS)`. A
 * versão anterior usava porcentagem do output, o que empilhava duas
 * exponenciais (razão hiperbólica × tabela Fibonacci) e transformava a espiral
 * num penhasco de 7 pontos de integridade — ver `OVERLOAD_PER_EXCESS`.
 */
export function autoOverload(draw: number, output: number): number {
  if (output <= 0) return OVERLOAD_MAX
  if (draw <= output) return 0
  const excess = draw - output
  return clamp(Math.ceil(excess / OVERLOAD_PER_EXCESS), 1, OVERLOAD_MAX)
}

/**
 * Sobrecarga efetiva = dial manual + automática + estresse de warp, travada em
 * 0-20 antes de indexar as tabelas (decisão #29 — versão anterior das specs
 * esquecia o `autoOverload` e ele nunca chegava a causar dano).
 */
export function effectiveOverload(
  manualOverload: number,
  auto: number,
  warpStress = 0,
): number {
  return clamp(
    Math.round(manualOverload + auto + warpStress),
    OVERLOAD_MIN,
    OVERLOAD_MAX,
  )
}

/** Chance de breach neste turno, proporcional ao dano acumulado do WC. */
export function breachChance(warpCoreIntegrity: number): number {
  return damageFraction(warpCoreIntegrity) * BREACH_CHANCE_AT_FULL_DAMAGE
}

export interface WarpCoreTurnInput {
  manualOverload: number
  /** Já calculado de `subsystemDraw` → `autoOverload`. */
  autoOverload: number
  /** Estresse transitório de viagem acima de warp 4 (capability `navigation`). */
  warpStress?: number
  warpCoreIntegrity: number
  /** Breach já ativo não recomeça. */
  breachActive?: boolean
  /** Docking suprime explosão/breach (task 3.2) — o dano por turno continua. */
  suppressRolls?: boolean
}

export interface WarpCoreTurnResult {
  /** Sobrecarga efetiva usada nas tabelas, 0-20. */
  overload: number
  /** Dano a subtrair da integridade do WC neste turno. */
  damage: number
  exploded: boolean
  breachStarted: boolean
}

/**
 * Resolve o turno do Warp Core: dano por sobrecarga + rolls de explosão e
 * breach (independentes entre si — combate sozinho já pode furar o core, sem
 * sobrecarga nenhuma).
 *
 * Com `suppressRolls` nenhum `rng()` é consumido; sem ele, exatamente dois, nesta
 * ordem: explosão, depois breach.
 */
export function resolveWarpCoreTurn(
  input: WarpCoreTurnInput,
  rng: () => number = Math.random,
): WarpCoreTurnResult {
  const overload = effectiveOverload(
    input.manualOverload,
    input.autoOverload,
    input.warpStress,
  )
  const result: WarpCoreTurnResult = {
    overload,
    damage: WARP_CORE_DAMAGE_TABLE[overload],
    exploded: false,
    breachStarted: false,
  }
  if (input.suppressRolls) return result

  const explosionRoll = rng()
  const breachRoll = rng()
  result.exploded = explosionRoll < WARP_CORE_EXPLOSION_CHANCE_TABLE[overload]
  result.breachStarted =
    !input.breachActive && breachRoll < breachChance(input.warpCoreIntegrity)
  return result
}

/** Breach recém-aberto: 5 turnos no relógio, contenção zerada. */
export function startBreach(): RadiationBreach {
  return { active: true, containment: 0, turnsRemaining: BREACH_TURNS }
}
