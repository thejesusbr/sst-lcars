/**
 * Motor de Turno (turnEngine): orquestra a resolução estrita de turnos em 5 etapas
 * (Ação do Jogador → Warp Core → Turno Inimigo → Condições Terminais → Log/UI)
 * e fornece os modos de avanço (End Turn, Skip N Turns, Docking Loop).
 *
 * TS puro, sem import de Vue/Pinia.
 */

import type { EndGameReason, GameState, GridCoord } from '@/types/game'
import { SUBSYSTEM_KEYS } from '@/types/game'
import {
  firePhasers,
  fireTorpedoes,
  getVisibleEnemies,
  hailTarget,
  isEnemyType,
  loadTube,
  tickCloakStress,
  unloadTube,
} from '@/engine/combat'
import { autoOverload, resolveWarpCoreTurn, startBreach, subsystemDraw } from '@/engine/warpCore'
import { evaluateEndGame } from '@/engine/endGame'
import { regenStarbasePools } from '@/engine/docking'

export type PlayerActionType =
  | 'fire_phasers'
  | 'fire_torpedoes'
  | 'load_tube'
  | 'unload_tube'
  | 'hail'
  | 'move_impulse'
  | 'move_warp'
  | 'launch_probe'
  | 'send_party'
  | 'end_turn'

export interface PlayerAction {
  type: PlayerActionType
  targetId?: string
  tubeId?: number
  targetCoord?: GridCoord
  warpFactor?: number
  teamId?: string
}

export interface TurnResult {
  stardate: number
  events: string[]
  damageTaken: number
  subsystemDamageTaken: boolean
  breachStarted: boolean
  newEnemiesEncountered: boolean
  missionCompleted: boolean
  terminalReason: EndGameReason | null
  warpCoreExploded: boolean
}

/**
 * Atualiza a contagem regressiva de asfixia do Life Support:
 * - Se integridade < 40: inicia em 5 (se ainda não iniciado) ou decrementa em 1.
 * - Se integridade >= 40: limpa a contagem (null).
 */
export function updateLifeSupportCountdown(state: GameState): void {
  if (state.subsystems.life < 40) {
    if (state.lifeSupportTurnsRemaining === null) {
      state.lifeSupportTurnsRemaining = 5
    } else {
      state.lifeSupportTurnsRemaining -= 1
    }
  } else {
    state.lifeSupportTurnsRemaining = null
  }
}

/**
 * Resolve os ataques inimigos no setor atual seguindo a fórmula exata do 1978 SST.
 */
function resolveEnemyTurn(
  state: GameState,
  options: { redirectDamageToDockedBase?: boolean } = {},
  rng: () => number = Math.random
): {
  damageTaken: number
  subsystemDamageTaken: boolean
  events: string[]
  dockedBaseDestroyed: boolean
} {
  let damageTaken = 0
  let subsystemDamageTaken = false
  const events: string[] = []
  let dockedBaseDestroyed = false

  // 1. Cloaked Raiders acumulam estresse
  for (const entity of state.currentSector) {
    if (entity.type === 'cloaked_raider' && entity.cloaked) {
      tickCloakStress(state)
    }
  }

  // 2. Inimigos visíveis atacam
  const visibleEnemies = getVisibleEnemies(state)
  for (const enemy of visibleEnemies) {
    const power = enemy.enemyPower ?? 0
    if (power <= 0) continue

    const dist = Math.hypot(
      state.position.sector.row - enemy.position.row,
      state.position.sector.col - enemy.position.col
    )
    const euclideanDist = Math.max(1, dist)
    // H = floor((enemyPower / euclideanDistance) * (2 + random(0,1)))
    const H = Math.floor((power / euclideanDist) * (2 + rng()))
    if (H <= 0) continue

    if (options.redirectDamageToDockedBase && state.dockedBaseId) {
      const base = state.starbases.find((b) => b.id === state.dockedBaseId)
      if (base && !base.destroyed) {
        base.resourcePool = Math.max(0, base.resourcePool - H)
        events.push(`Base atracada absorveu ${H} de dano inimigo.`)
        if (base.resourcePool === 0) {
          base.destroyed = true
          dockedBaseDestroyed = true
          events.push(`A base atracada foi destruída pelos ataques inimigos!`)
        }
      }
    } else {
      // Dano no jogador: escudo absorve primeiro
      damageTaken += H
      if (state.shieldEnergy >= H) {
        state.shieldEnergy -= H
        state.shieldDamageTaken += H
      } else {
        const remainder = H - state.shieldEnergy
        state.shieldDamageTaken += state.shieldEnergy
        state.shieldEnergy = 0
        state.mainEnergy = Math.max(0, state.mainEnergy - remainder)
      }

      events.push(`Nave sob ataque: -${H} energia.`)

      // Dano aleatório a subsistema se hit forte (H >= 20)
      if (H >= 20 && rng() < 0.6 && H / Math.max(1, state.shieldEnergy) > 0.02) {
        const subIndex = Math.floor(rng() * SUBSYSTEM_KEYS.length)
        const subKey = SUBSYSTEM_KEYS[subIndex]
        const dmg = H / Math.max(1, state.shieldEnergy) + 0.5 * rng()
        state.subsystems[subKey] = Math.max(0, state.subsystems[subKey] - dmg)
        subsystemDamageTaken = true
        events.push(`Subsistema atingido: ${subKey} sofreu dano de combate.`)
      }
    }

    // Ataque enfraquece o próprio inimigo: enemyPower / (3 + random(0,1))
    enemy.enemyPower = Math.floor(power / (3 + rng()))
  }

  return { damageTaken, subsystemDamageTaken, events, dockedBaseDestroyed }
}

/**
 * Resolve 1 turno no motor principal (5 etapas fixas).
 */
export function resolvePlayerTurn(
  state: GameState,
  action: PlayerAction,
  rng: () => number = Math.random
): TurnResult {
  const events: string[] = []
  let damageTaken = 0
  let subsystemDamageTaken = false
  let missionCompleted = false
  const prevEnemyCount = state.currentSector.filter((e) => isEnemyType(e.type)).length

  // ETAPA 1: Aplicar ação do jogador
  if (action.type === 'fire_phasers') {
    firePhasers(state, state.phaserPower, rng)
    events.push('Phasers disparados.')
  } else if (action.type === 'fire_torpedoes') {
    fireTorpedoes(state, rng)
    events.push('Torpedos disparados.')
  } else if (action.type === 'load_tube' && action.tubeId !== undefined) {
    loadTube(state, action.tubeId)
    events.push(`Tubo ${action.tubeId} carregado.`)
  } else if (action.type === 'unload_tube' && action.tubeId !== undefined) {
    unloadTube(state, action.tubeId)
    events.push(`Tubo ${action.tubeId} descarregado.`)
  } else if (action.type === 'hail' && action.targetId) {
    hailTarget(state, action.targetId, rng)
    events.push('Canal de comunicação aberto (Hail).')
  } else if (action.type === 'launch_probe' && action.targetCoord) {
    state.probe = { target: action.targetCoord, turnsRemaining: 2 }
    events.push('Sonda lançada.')
  }

  // ETAPA 2: Warp Core
  const draw = subsystemDraw(state)
  const autoOv = autoOverload(draw)
  const wcRes = resolveWarpCoreTurn(
    {
      manualOverload: state.manualOverload,
      autoOverload: autoOv,
      warpStress: 0,
      warpCoreIntegrity: state.subsystems.warpCore,
      breachActive: state.breach.active,
      suppressRolls: false,
    },
    rng
  )

  state.subsystems.warpCore = Math.max(0, state.subsystems.warpCore - wcRes.damage)
  if (wcRes.breachStarted) {
    state.breach = startBreach()
    events.push('ALERTA: Vazamento de radiação no Warp Core iniciado!')
  }

  // ETAPA 3: Turno inimigo
  const enemyRes = resolveEnemyTurn(state, {}, rng)
  damageTaken += enemyRes.damageTaken
  subsystemDamageTaken = subsystemDamageTaken || enemyRes.subsystemDamageTaken
  events.push(...enemyRes.events)

  // ETAPA 4: Condições Terminais
  updateLifeSupportCountdown(state)
  const endRes = evaluateEndGame(state, {
    warpCoreExploded: wcRes.exploded,
    dockedBaseDestroyed: enemyRes.dockedBaseDestroyed,
  })

  // ETAPA 5: Log e atualização de tempo/missão
  state.stardate += 1
  if (state.probe) {
    state.probe.turnsRemaining -= 1
    if (state.probe.turnsRemaining <= 0) {
      state.probe = null
      missionCompleted = true
      events.push('Missão de sonda concluída.')
    }
  }

  regenStarbasePools(state.starbases, state.docked ? state.dockedBaseId : null)

  const newEnemyCount = state.currentSector.filter((e) => isEnemyType(e.type)).length
  const newEnemiesEncountered = newEnemyCount > prevEnemyCount

  return {
    stardate: state.stardate,
    events,
    damageTaken,
    subsystemDamageTaken,
    breachStarted: wcRes.breachStarted,
    newEnemiesEncountered,
    missionCompleted,
    terminalReason: endRes?.reason ?? null,
    warpCoreExploded: wcRes.exploded,
  }
}

/**
 * End Turn: avanço de 1 turno sem ação do jogador.
 */
export function endTurn(state: GameState, rng: () => number = Math.random): TurnResult {
  return resolvePlayerTurn(state, { type: 'end_turn' }, rng)
}

/**
 * Skip N Turns: repete End Turn até maxTurns vezes, interrompendo antecipadamente
 * se ocorrer inimigo novo, dano, breach, fim de jogo ou conclusão de missão.
 */
export function skipTurns(
  state: GameState,
  maxTurns: number,
  rng: () => number = Math.random
): { completedTurns: number; stoppedEarly: boolean; lastResult: TurnResult } {
  let completedTurns = 0
  let stoppedEarly = false
  let lastResult: TurnResult = endTurn(state, rng)
  completedTurns++

  for (let i = 1; i < maxTurns; i++) {
    if (
      lastResult.newEnemiesEncountered ||
      lastResult.damageTaken > 0 ||
      lastResult.subsystemDamageTaken ||
      lastResult.breachStarted ||
      lastResult.terminalReason !== null ||
      lastResult.missionCompleted
    ) {
      stoppedEarly = true
      break
    }
    lastResult = endTurn(state, rng)
    completedTurns++
  }

  return { completedTurns, stoppedEarly, lastResult }
}

/**
 * Modo Docking Loop: resolve 1 turno em base atracada (STARBASE_DOCK),
 * redirecionando ataques pra base e suprimindo rolagens de explosão/breach.
 */
export function dockAndRepairTurn(
  state: GameState,
  rng: () => number = Math.random
): TurnResult {
  const events: string[] = []
  const prevEnemyCount = state.currentSector.filter((e) => isEnemyType(e.type)).length

  // Sem ação de jogador
  // Warp core com suppressRolls = true
  const draw = subsystemDraw(state)
  const autoOv = autoOverload(draw)
  const wcRes = resolveWarpCoreTurn(
    {
      manualOverload: state.manualOverload,
      autoOverload: autoOv,
      warpStress: 0,
      warpCoreIntegrity: state.subsystems.warpCore,
      breachActive: state.breach.active,
      suppressRolls: true,
    },
    rng
  )
  state.subsystems.warpCore = Math.max(0, state.subsystems.warpCore - wcRes.damage)

  // Turno inimigo com dano redirecionado pra base atracada
  const enemyRes = resolveEnemyTurn(state, { redirectDamageToDockedBase: true }, rng)
  events.push(...enemyRes.events)

  updateLifeSupportCountdown(state)
  const endRes = evaluateEndGame(state, {
    warpCoreExploded: wcRes.exploded,
    dockedBaseDestroyed: enemyRes.dockedBaseDestroyed,
  })

  state.stardate += 1
  regenStarbasePools(state.starbases, state.docked ? state.dockedBaseId : null)

  const newEnemyCount = state.currentSector.filter((e) => isEnemyType(e.type)).length

  return {
    stardate: state.stardate,
    events,
    damageTaken: 0,
    subsystemDamageTaken: false,
    breachStarted: false,
    newEnemiesEncountered: newEnemyCount > prevEnemyCount,
    missionCompleted: false,
    terminalReason: endRes?.reason ?? null,
    warpCoreExploded: false,
  }
}
