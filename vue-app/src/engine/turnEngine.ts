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
  HULL_DAMAGE_DIVISOR,
  STARDATE_PER_TURN,
  warpCoreOutput,
} from '@/engine/constants'
import {
  acquireWeaponsLock,
  firePhasers,
  fireTorpedoes,
  hailTarget,
  loadTube,
  repositionEnemies,
  resolveCombatTurn,
  tickCloakStress,
  unloadTube,
} from '@/engine/combat'
import { countEnemies, getVisibleEnemies, occupancyOf } from '@/engine/sector'
import { autoOverload, resolveWarpCoreTurn, startBreach, subsystemDraw } from '@/engine/warpCore'
import { evaluateEndGame } from '@/engine/endGame'
import { regenStarbasePools } from '@/engine/docking'
import {
  resolveBreachTurn,
  resolveDamageControlTurn,
  resolveLandingPartyTurn,
  sendParty,
} from '@/engine/damageControl'
import {
  clampImpulsePower,
  coordKey,
  impulseCellsPerTurn,
  inGrid,
  launchProbe,
  manualMove,
  planWarpTrip,
  propulsionBlocked,
  resolveNavigationTurn,
  rollStall,
  warpStress,
} from '@/engine/navigation'

export type PlayerActionType =
  | 'fire_phasers'
  | 'fire_torpedoes'
  | 'load_tube'
  | 'unload_tube'
  | 'hail'
  | 'lock_weapons'
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
  /**
   * Ação recusada: **nenhum turno foi consumido**, nada no estado mudou. Existe
   * porque 3 ações estavam declaradas em `PlayerActionType` sem ramo de
   * implementação — eram aceitas, gastavam turno e não faziam nada. A spec agora
   * exige: ou produz efeito, ou é recusada com motivo.
   */
  rejected: boolean
  rejectionReason: string | null
}

/**
 * Hook opcional invocado 1× quando o movimento troca a nave de quadrante.
 *
 * É a **costura** por onde `world-generation` povoa `currentSector` sem o
 * `turnEngine` importar `worldGen` — se importasse, as duas mudanças ficariam
 * acopladas e nenhuma seria verificável sozinha (design.md decisão 3). Default
 * no-op: sem hook, o turno resolve normal e `currentSector` fica intocado.
 */
export type QuadrantEnterHook = (state: GameState, quadrant: GridCoord) => void

export interface TurnOptions {
  onQuadrantEnter?: QuadrantEnterHook
  redirectDamageToDockedBase?: boolean
  suppressWarpCoreRolls?: boolean
}

/** Resultado da etapa 1, que decide o que as etapas seguintes fazem. */
interface ActionOutcome {
  rejected: boolean
  reason: string | null
  /** Turno com disparo: suprime o resfriamento passivo de phaser. */
  fired: boolean
  /** Turno com movimento real sob impulso: só ele gasta duração de boost. */
  movedUnderImpulse: boolean
  /** Torpedos efetivamente disparados: entra no consumo do turno. */
  torpedoesFired: number
  events: string[]
}

const HAIL_MESSAGES: Record<string, string> = {
  surrender: 'Inimigo se rendeu — tripulação capturada e levada à cela.',
  base_status: 'Base respondeu com o status do seu pool de recursos.',
  rejected: 'Hail ignorado — o inimigo não responde.',
  full_brig: 'Rendição recusada: a cela está lotada.',
  not_found: 'Alvo não encontrado.',
}

/** Ocupação no grid de QUADRANTES, a partir do que o jogador **conhece**. */
function knownHostileQuadrants(state: GameState): (c: GridCoord) => boolean {
  return (c) => {
    const entry = state.exploredQuadrants[coordKey(c)]
    // Primeiro dígito do KBS é a contagem de Klingons. Quadrante não explorado
    // conta como livre: o Auto-Nav não pode desviar do que a nave não escaneou.
    return entry ? Number(entry.code[0]) > 0 : false
  }
}

/**
 * ETAPA 1 — aplica a ação do jogador.
 *
 * Toda ação declarada em `PlayerActionType` tem ramo aqui. Recusa devolve
 * `rejected: true` e o chamador aborta o turno sem consumir stardate.
 */
function applyPlayerAction(
  state: GameState,
  action: PlayerAction,
  rng: () => number,
): ActionOutcome {
  const events: string[] = []
  const ok = (extra: Partial<ActionOutcome> = {}): ActionOutcome => ({
    rejected: false,
    reason: null,
    fired: false,
    movedUnderImpulse: false,
    torpedoesFired: 0,
    events,
    ...extra,
  })
  const reject = (reason: string): ActionOutcome => ({
    rejected: true,
    reason,
    fired: false,
    movedUnderImpulse: false,
    torpedoesFired: 0,
    events: [],
  })

  switch (action.type) {
    case 'fire_phasers': {
      const res = firePhasers(state, state.phaserPower, rng)
      if (!res.success) return reject(`Phasers: ${res.reason}`)
      events.push(`Phasers disparados (${res.totalDamageDealt} de dano).`)
      return ok({ fired: true })
    }

    case 'fire_torpedoes': {
      const res = fireTorpedoes(state, rng)
      if (!res.success) return reject(`Torpedos: ${res.reason}`)
      events.push(`Torpedos disparados (${res.shotsFired} tubo(s)).`)
      return ok({ fired: true, torpedoesFired: res.shotsFired })
    }

    // Carregar/descarregar custa 1 turno. `turnSpent` é o que decide, NÃO
    // `success`: falha por dano moderado (`failed_load`) gasta o turno — é a
    // penalidade da mecânica, não uma recusa.
    case 'load_tube': {
      if (action.tubeId === undefined) return reject('Tubo não informado.')
      const res = loadTube(state, action.tubeId, rng)
      if (!res.turnSpent) return reject(`Carregamento: ${res.reason}`)
      events.push(
        res.success
          ? `Tubo ${action.tubeId} carregado.`
          : `Falha no carregamento do tubo ${action.tubeId} — turno perdido.`,
      )
      return ok()
    }

    case 'unload_tube': {
      if (action.tubeId === undefined) return reject('Tubo não informado.')
      const res = unloadTube(state, action.tubeId, rng)
      if (!res.turnSpent) return reject(`Descarregamento: ${res.reason}`)
      events.push(
        res.success
          ? `Tubo ${action.tubeId} descarregado.`
          : `Falha no descarregamento do tubo ${action.tubeId} — turno perdido.`,
      )
      return ok()
    }

    case 'hail': {
      if (!action.targetId) return reject('Nenhum alvo para hail.')
      const res = hailTarget(state, action.targetId, rng)
      if (res.status === 'not_found') return reject('Alvo não encontrado.')
      events.push(HAIL_MESSAGES[res.status])
      return ok()
    }

    // Reaquisição manual do Weapons Lock custa 1 turno (decisão #23).
    case 'lock_weapons': {
      if (!acquireWeaponsLock(state)) {
        return reject(
          'Não foi possível travar: SRS desligado, em crítico, ou sem alvo visível.',
        )
      }
      events.push('Weapons Lock adquirido.')
      return ok()
    }

    case 'launch_probe': {
      if (!action.targetCoord) return reject('Nenhum alvo para a sonda.')
      const res = launchProbe(state, action.targetCoord)
      if (!res.success) {
        return reject(
          res.reason === 'no_probes'
            ? 'Sem sondas em estoque.'
            : res.reason === 'probe_in_flight'
              ? 'Já há uma sonda em trânsito.'
              : 'Alvo fora da galáxia.',
        )
      }
      events.push(`Sonda lançada — resolve em ${res.turns} turno(s).`)
      return ok()
    }

    case 'move_impulse': {
      // Movimento intra-setor. Inimigos reposicionam ANTES do deslocamento
      // (decisão #21) — determinístico, só em ação de movimento.
      const target = action.targetCoord
      if (!target || !inGrid(target)) return reject('Destino fora do setor.')
      if (propulsionBlocked(state.subsystems.warp)) {
        return reject('Warp Engines em estado crítico — impulso indisponível.')
      }
      const power = clampImpulsePower(state.impulsePower, state.subsystems.warp)
      if (power <= 0 && !state.boostActive) {
        return reject('Impulse Power em zero.')
      }

      repositionEnemies(state, rng)

      if (rollStall(state.subsystems.warp, rng)) {
        events.push('Motores estagnaram — a nave não avançou.')
        return ok()
      }

      // Potência do dial vira velocidade: células cobertas NESTE turno.
      // Destino mais longe que isso fica em trânsito — engaja de novo.
      const speed = impulseCellsPerTurn(power, state.boostActive)
      const isOccupied = occupancyOf(state.currentSector)
      const move = manualMove(state.position.sector, target, isOccupied, speed)
      if (move.rejected) return reject('Destino fora do setor.')
      state.position.sector = move.position
      const arrived =
        move.position.row === target.row && move.position.col === target.col
      events.push(
        move.interrupted
          ? 'Obstáculo no caminho — nave parou curto do destino.'
          : arrived
            ? `Impulso: nave em ${move.position.col},${move.position.row}.`
            : `Impulso: em trânsito, nave em ${move.position.col},${move.position.row}.`,
      )
      return ok({ movedUnderImpulse: true })
    }

    case 'move_warp': {
      // Warp é INTER-quadrante: o destino é uma célula da galáxia, e a
      // ocupação usada pela rota do Auto-Nav é quadrante hostil CONHECIDO.
      const target = action.targetCoord ?? state.destination
      if (!target) return reject('Nenhum destino selecionado.')
      if (state.warpTrip) return reject('Viagem de warp já em curso.')

      repositionEnemies(state, rng)

      const plan = planWarpTrip({
        from: state.position.quadrant,
        to: target,
        warpFactor: action.warpFactor ?? state.warpFactor,
        autoNav: state.subsystemsOn.autoNav,
        isOccupied: knownHostileQuadrants(state),
        warpIntegrity: state.subsystems.warp,
        autoNavIntegrity: state.subsystems.autoNav,
      })
      if (!plan.ok) {
        return reject(
          plan.reason === 'engines_critical'
            ? 'Warp Engines em estado crítico — warp indisponível.'
            : 'Destino fora da galáxia.',
        )
      }
      state.warpTrip = plan.trip
      events.push(
        `Warp ${plan.trip.warpFactor} engajado — ${plan.trip.turnsRemaining} turno(s) até o destino.`,
      )
      return ok()
    }

    case 'send_party': {
      if (!action.teamId) return reject('Nenhuma equipe designada.')
      if (!action.targetCoord) return reject('Nenhum planeta designado.')
      const res = sendParty(state, action.teamId, action.targetCoord)
      if (!res.success) {
        return reject(
          res.reason === 'mission_active'
            ? 'Já há uma equipe em missão.'
            : res.reason === 'no_team'
              ? 'Equipe indisponível.'
              : 'Nenhum planeta adjacente no setor alvo.',
        )
      }
      events.push('Equipe de desembarque enviada ao planeta.')
      return ok()
    }

    case 'end_turn':
      return ok()
  }
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

  // O tick de estresse de cloak NÃO mora aqui: `tickCloakStress` já percorre
  // `currentSector` inteiro, e chamá-la dentro de um laço sobre as entidades
  // fazia o estresse de TODOS subir 1× por raider cloacado — com 2 raiders,
  // dobrava. O `resolvePlayerTurn` chama uma vez, na etapa 3.

  // Inimigos visíveis atacam
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
      // Dano no jogador: escudo absorve primeiro, o excedente arrebenta CASCO.
      // Antes o excedente descontava de `mainEnergy` — mas energia é vazão, não
      // estoque, então não havia nada pra drenar. Casco é o sink real.
      damageTaken += H
      if (state.shieldEnergy >= H) {
        state.shieldEnergy -= H
        state.shieldDamageTaken += H
        events.push(`Escudos absorveram ${H} de dano.`)
      } else {
        const remainder = H - state.shieldEnergy
        state.shieldDamageTaken += state.shieldEnergy
        state.shieldEnergy = 0
        const hullLoss = remainder / HULL_DAMAGE_DIVISOR
        state.hullIntegrity = Math.max(0, state.hullIntegrity - hullLoss)
        events.push(
          `Escudos saturados — casco perdeu ${hullLoss.toFixed(1)} de integridade.`,
        )
      }

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
  rng: () => number = Math.random,
  options: TurnOptions = {}
): TurnResult {
  const prevEnemyCount = countEnemies(state.currentSector)
  const quadrantBefore = { ...state.position.quadrant }

  // ── ETAPA 1: Ação do jogador ─────────────────────────────────────────────
  const outcome = applyPlayerAction(state, action, rng)
  if (outcome.rejected) {
    // Recusa NÃO consome turno: nada avança, nenhum tick roda, o inimigo não
    // responde. É o que impede ação declarada de gastar turno fazendo nada.
    return rejectedTurn(state, outcome.reason)
  }

  const events = [...outcome.events]
  let damageTaken = 0
  let subsystemDamageTaken = false

  // ── ETAPA 2: Warp Core (+ estresse de warp real, + contenção de breach) ──
  // `warpStress` era `0` cravado, o que deixava metade da decisão #29 inerte:
  // `effectiveOverload()` somava certo e recebia zero. Estresse só existe em
  // turno de VIAGEM (viagem em curso), não por ter o dial em warp 8 parado.
  const stress = state.warpTrip ? warpStress(state.warpTrip.warpFactor) : 0
  const wcRes = resolveWarpCoreTurn(
    {
      manualOverload: state.manualOverload,
      // `subsystemDraw` recebe as AÇÕES do turno, não só o estado. Sem isso,
      // Impulso (até 2000), Phaser (até 3000) e custo de disparo de torpedo
      // contribuíam SEMPRE zero — o consumo máximo alcançável ficava em ~2960
      // de 4500 e `autoOverload` nunca disparava. Mesma classe de bug do
      // `warpStress: 0`: função correta alimentada com entrada vazia.
      // Output EFETIVO, não o nominal: core danificado gera menos, então o
      // mesmo consumo passa a estourar o orçamento e a sobrecarga realimenta o
      // dano. É a espiral.
      autoOverload: autoOverload(
        subsystemDraw(state, {
          movedUnderImpulse: outcome.movedUnderImpulse,
          firedPhasers: outcome.fired && action.type === 'fire_phasers',
          torpedoesFired: outcome.torpedoesFired,
        }),
        warpCoreOutput(state.subsystems.warpCore)
      ),
      warpStress: stress,
      warpCoreIntegrity: state.subsystems.warpCore,
      breachActive: state.breach.active,
      suppressRolls: options.suppressWarpCoreRolls ?? false,
    },
    rng
  )
  state.subsystems.warpCore = Math.max(0, state.subsystems.warpCore - wcRes.damage)
  if (wcRes.breachStarted) {
    state.breach = startBreach()
    events.push('ALERTA: Vazamento de radiação no Warp Core iniciado!')
  }

  const breachRes = resolveBreachTurn(state)
  if (breachRes.contained) events.push('Vazamento de radiação contido.')
  else if (breachRes.expired) {
    events.push('CRÍTICO: contenção falhou — exposição letal à radiação.')
  }

  // ── ETAPA 3: Turno inimigo (+ estresse/cooldown de cloak) ────────────────
  // `tickCloakStress` roda 1× por turno. Antes era chamada DENTRO de um laço
  // sobre `currentSector`, então com 2 raiders cloacados o estresse de todos
  // subia 2× — a spec exige cada tick exatamente uma vez.
  tickCloakStress(state)
  const enemyRes = resolveEnemyTurn(
    state,
    { redirectDamageToDockedBase: options.redirectDamageToDockedBase },
    rng
  )
  damageTaken += enemyRes.damageTaken
  subsystemDamageTaken = enemyRes.subsystemDamageTaken
  events.push(...enemyRes.events)

  // ── ETAPA 4: Condições terminais ─────────────────────────────────────────
  updateLifeSupportCountdown(state)
  const endRes = evaluateEndGame(state, {
    warpCoreExploded: wcRes.exploded,
    dockedBaseDestroyed: enemyRes.dockedBaseDestroyed,
  })

  // ── ETAPA 5: Log e atualização de domínios ───────────────────────────────
  state.stardate += STARDATE_PER_TURN

  const dcRes = resolveDamageControlTurn(state)
  for (const [sys, amount] of Object.entries(dcRes.repairs)) {
    if (amount > 0) events.push(`Reparo em ${sys}: +${amount}.`)
  }

  const navRes = resolveNavigationTurn(
    state,
    {
      movedUnderImpulse: outcome.movedUnderImpulse,
      quadrantOccupied: knownHostileQuadrants(state),
    },
    rng
  )
  events.push(...navRes.events)

  const combatRes = resolveCombatTurn(state, { fired: outcome.fired }, rng)
  events.push(...combatRes.events)

  const partyRes = resolveLandingPartyTurn(state, rng)
  if (partyRes.completed) {
    events.push(
      partyRes.destroyed
        ? 'Equipe de desembarque perdida em setor hostil.'
        : partyRes.boost > 0
          ? `Dilítium recuperado: +${partyRes.boost} de integridade no Warp Core.`
          : 'Equipe retornou — planeta estéril, nenhum dilítium.',
    )
  }

  regenStarbasePools(state.starbases, state.docked ? state.dockedBaseId : null)

  // Troca de quadrante notifica o hook 1×, depois do movimento resolver.
  if (!sameQuadrant(quadrantBefore, state.position.quadrant)) {
    options.onQuadrantEnter?.(state, state.position.quadrant)
    settleShipCell(state)
  }

  return {
    stardate: state.stardate,
    events,
    damageTaken,
    subsystemDamageTaken,
    breachStarted: wcRes.breachStarted,
    newEnemiesEncountered: countEnemies(state.currentSector) > prevEnemyCount,
    missionCompleted: partyRes.completed || navRes.probeResolved,
    terminalReason: endRes?.reason ?? null,
    warpCoreExploded: wcRes.exploded,
    rejected: false,
    rejectionReason: null,
  }
}

function sameQuadrant(a: GridCoord, b: GridCoord): boolean {
  return a.row === b.row && a.col === b.col
}

/**
 * Depois do hook povoar o setor, a nave pode estar em cima de uma entidade — o
 * gerador não sabe onde ela está. Empurra pra célula livre mais próxima.
 */
function settleShipCell(state: GameState): void {
  const isOccupied = occupancyOf(state.currentSector)
  if (!isOccupied(state.position.sector)) return
  for (let radius = 1; radius <= 7; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        const c = {
          row: state.position.sector.row + dr,
          col: state.position.sector.col + dc,
        }
        if (inGrid(c) && !isOccupied(c)) {
          state.position.sector = c
          return
        }
      }
    }
  }
}

/** Turno recusado: estado intocado, stardate parado. */
function rejectedTurn(state: GameState, reason: string | null): TurnResult {
  return {
    stardate: state.stardate,
    events: reason ? [reason] : [],
    damageTaken: 0,
    subsystemDamageTaken: false,
    breachStarted: false,
    newEnemiesEncountered: false,
    missionCompleted: false,
    terminalReason: null,
    warpCoreExploded: false,
    rejected: true,
    rejectionReason: reason,
  }
}

/**
 * End Turn: avanço de 1 turno sem ação do jogador.
 */
export function endTurn(
  state: GameState,
  rng: () => number = Math.random,
  options: TurnOptions = {}
): TurnResult {
  return resolvePlayerTurn(state, { type: 'end_turn' }, rng, options)
}

/**
 * Skip N Turns: repete End Turn até maxTurns vezes, interrompendo antecipadamente
 * se ocorrer inimigo novo, dano, breach, fim de jogo ou conclusão de missão.
 */
export function skipTurns(
  state: GameState,
  maxTurns: number,
  rng: () => number = Math.random,
  options: TurnOptions = {}
): { completedTurns: number; stoppedEarly: boolean; lastResult: TurnResult } {
  let completedTurns = 0
  let stoppedEarly = false
  let lastResult: TurnResult = endTurn(state, rng, options)
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
    lastResult = endTurn(state, rng, options)
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
  rng: () => number = Math.random,
  options: TurnOptions = {}
): TurnResult {
  // Delega pra resolução normal em vez de reimplementar as 5 etapas. A versão
  // anterior era uma CÓPIA das etapas 2-5 e por isso perdeu todo tick novo
  // acrescentado ao caminho principal (era o mesmo padrão de divergência que
  // deixou 12 comportamentos inertes). O modo de docking é a resolução normal
  // com 2 flags.
  return resolvePlayerTurn(
    state,
    { type: 'end_turn' },
    rng,
    {
      ...options,
      redirectDamageToDockedBase: true,
      suppressWarpCoreRolls: true,
    }
  )
}
