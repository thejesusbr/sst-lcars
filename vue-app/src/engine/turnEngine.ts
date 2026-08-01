/**
 * Motor de Turno (turnEngine): orquestra a resolução estrita de turnos em 5 etapas
 * (Ação do Jogador → Warp Core → Turno Inimigo → Condições Terminais → Log/UI)
 * e fornece os modos de avanço (End Turn, Skip N Turns, Docking Loop).
 *
 * TS puro, sem import de Vue/Pinia.
 */

import type {
  EndGameReason,
  GameState,
  GridCoord,
  TurnEvent,
  TurnEventDraft,
  TurnStep,
} from '@/types/game'
import { STARBASE_TYPE_LABELS, SUBSYSTEM_KEYS, SectorEntityType } from '@/types/game'
import {
  CRITICAL_INTEGRITY,
  ENEMY_ATTACK_COST,
  ENEMY_ENERGY_MAX,
  ENEMY_ENERGY_RECHARGE,
  HULL_DAMAGE_DIVISOR,
  SHIELD_ENERGY_MAX,
  SHIELD_REGEN_FLOOR_FRACTION,
  SHIELD_REGEN_RATE,
  clamp,
  STARDATE_PER_TURN,
  damageFalloff,
  damageFraction,
  degradedChance,
  isCritical,
  warpCoreOutput,
} from '@/engine/constants'
import {
  acquireWeaponsLock,
  autoLoadTubes,
  firePhasers,
  fireTorpedoes,
  hailTarget,
  loadTube,
  moveHostiles,
  resolveCombatTurn,
  tickCloakStress,
  unloadTube,
  evasionChance,
} from '@/engine/combat'
import {
  chebyshev,
  countEnemies,
  getVisibleEnemies,
  isEnemyType,
  obstaclesBetween,
  occupancyOf,
} from '@/engine/sector'
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
  lrsNeighborhood,
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
  | 'survey'
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
  /**
   * Eventos **tipados e ordenados**, cada um carimbado com a etapa que o
   * produziu. Era `string[]`, o que obrigava a store a adivinhar a categoria de
   * log por substring e não deixava a UI encenar nada (`turn-presentation`).
   */
  events: TurnEvent[]
  damageTaken: number
  subsystemDamageTaken: boolean
  breachStarted: boolean
  newEnemiesEncountered: boolean
  missionCompleted: boolean
  terminalReason: EndGameReason | null
  warpCoreExploded: boolean
  /**
   * Viagem de warp engajada NESTE turno, com a duração planejada.
   *
   * Existe porque `state.warpTrip` não serve pra isso: numa viagem de 1 turno
   * ele é criado na etapa 1 e zerado na etapa 5 da mesma resolução, então quem
   * olha o estado depois do despacho vê `null` e conclui que não houve viagem —
   * foi exatamente assim que a animação de warp curto deixou de acontecer. A
   * duração da apresentação (`turns × WARP_ANIMATION_MS[fator]`) precisa deste
   * dado no momento do engage.
   */
  warpTripStarted: { warpFactor: number; turns: number } | null
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
  /** Viagem engajada nesta ação, pra apresentação medir a duração. */
  warpTripStarted: { warpFactor: number; turns: number } | null
  events: TurnEventDraft[]
}

/**
 * Texto de log por status de Hail.
 *
 * `base_status` e `rejected` recebem o texto FORA daqui, montado a partir dos
 * dados que o `HailResult` carrega (tipo/quadrante/pool da base; a recusa
 * sorteada) — sem eles a mensagem genérica não dizia nada de útil.
 */
const HAIL_MESSAGES: Record<string, string> = {
  surrender: 'Inimigo se rendeu — tripulação capturada e levada à cela.',
  base_status: 'Base respondeu com o status do seu pool de recursos.',
  rejected: 'Hail ignorado — o inimigo não responde.',
  full_brig: 'Rendição recusada: a cela está lotada.',
  not_found: 'Alvo não encontrado.',
}

/** Monta a linha de log do Hail a partir do `HailResult`, não de um texto fixo. */
function hailLogText(res: ReturnType<typeof hailTarget>): string {
  if (res.status === 'base_status') {
    const type = res.revealedBaseType ? STARBASE_TYPE_LABELS[res.revealedBaseType] : 'Base'
    const at = res.revealedBaseQuadrant
      ? ` em ${res.revealedBaseQuadrant.col},${res.revealedBaseQuadrant.row}`
      : ''
    const pool = res.revealedBasePool !== undefined ? ` — pool ${res.revealedBasePool}.` : '.'
    return `${type}${at} responde ao hail${pool}`
  }
  if (res.status === 'rejected' && res.refusalText) return res.refusalText
  return HAIL_MESSAGES[res.status]
}

/** Carimba a etapa nos eventos que um módulo folha produziu sem saber dela. */
function stamp(step: TurnStep, drafts: TurnEventDraft[]): TurnEvent[] {
  return drafts.map((d) => ({ ...d, step }))
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

/** Urgência de cada nível — só serve pra comparar, nunca é exibida. */
const ALERT_RANK: Record<GameState['alertLevel'], number> = {
  green: 0,
  yellow: 1,
  red: 2,
}

/**
 * Sobe o alerta sozinho: `red` com hostil visível no setor, `yellow` com
 * hostil CONHECIDO na vizinhança (LRS ou adjacência já escaneada) e nenhum no
 * setor. NUNCA desce — a spec (`game-state-store`, "Alert condition...")
 * garante isso por construção aqui: só escreve se o nível calculado for MAIS
 * urgente que o atual, então limpar o setor ou se afastar de vizinhança
 * hostil não reverte o toggle que o jogador não tocou.
 */
function updateAlertLevel(state: GameState): void {
  let level: 'yellow' | 'red' | null = null

  if (getVisibleEnemies(state).length > 0) {
    level = 'red'
  } else {
    const hostile = knownHostileQuadrants(state)
    const nearby = lrsNeighborhood(state.position.quadrant).some(
      (q) => !sameQuadrant(q, state.position.quadrant) && hostile(q),
    )
    if (nearby) level = 'yellow'
  }

  if (level && ALERT_RANK[level] > ALERT_RANK[state.alertLevel]) {
    state.alertLevel = level
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
  const events: TurnEventDraft[] = []
  const ok = (extra: Partial<ActionOutcome> = {}): ActionOutcome => ({
    rejected: false,
    reason: null,
    fired: false,
    movedUnderImpulse: false,
    torpedoesFired: 0,
    warpTripStarted: null,
    events,
    ...extra,
  })
  const reject = (reason: string): ActionOutcome => ({
    rejected: true,
    reason,
    fired: false,
    movedUnderImpulse: false,
    torpedoesFired: 0,
    warpTripStarted: null,
    events: [],
  })

  // Em trânsito de warp NENHUMA ação de comando é aceita — não só as de
  // navegação. Disparar phaser, carregar tubo ou mandar equipe de desembarque
  // de dentro de uma bolha de warp não faz sentido.
  //
  // `end_turn` passa porque é o que o modo de viagem usa pra avançar os turnos
  // restantes sozinho; o botão manual de End Turn é desabilitado pela UI, que lê
  // a mesma flag (task 4.6). Ajustes livres (dials, escudo, despacho de CdD)
  // nunca chegam aqui: não passam pelo `turnEngine`.
  if (state.warpTrip && action.type !== 'end_turn') {
    return reject('Nave em warp — nenhuma ação disponível até a chegada.')
  }

  // Nada impedia engajar impulso ou warp direto do berço de atracagem. Undock
  // primeiro — e é ação livre, então o custo de lembrar é um clique.
  if (state.docked && (action.type === 'move_impulse' || action.type === 'move_warp')) {
    return reject('Nave atracada — desatraque antes de manobrar.')
  }

  switch (action.type) {
    // Um evento POR ALVO, não um agregado: a linha de phaser é desenhada entre
    // quem atira e cada alvo, então a apresentação precisa saber contra quem
    // (`entityId`) e com quanto (`amount`). O agregado
    // "Phasers disparados (N de dano)" não expressava nem um nem outro.
    case 'fire_phasers': {
      const res = firePhasers(state, state.phaserPower, rng)
      if (!res.success) return reject(`Phasers: ${res.reason}`)
      for (const hit of res.hits) {
        events.push({
          type: 'player_phasers',
          entityId: hit.enemyId,
          at: hit.position,
          amount: hit.damage,
          destroyed: hit.destroyed,
          text: hit.destroyed
            ? `Phasers: alvo atingido com ${hit.damage} de dano — destruído.`
            : `Phasers: alvo atingido com ${hit.damage} de dano.`,
        })
      }
      return ok({ fired: true })
    }

    case 'fire_torpedoes': {
      const res = fireTorpedoes(state, rng)
      if (!res.success) return reject(`Torpedos: ${res.reason}`)
      for (const hit of res.hits) {
        events.push({
          type: 'player_torpedo',
          entityId: hit.enemyId,
          at: hit.position,
          amount: hit.damage,
          destroyed: hit.destroyed,
          text: hit.destroyed
            ? `Torpedo do tubo ${hit.tubeId} atingiu com ${hit.damage} de dano — alvo destruído.`
            : `Torpedo do tubo ${hit.tubeId} atingiu com ${hit.damage} de dano.`,
        })
      }
      return ok({ fired: true, torpedoesFired: res.shotsFired })
    }

    // Carregar/descarregar custa 1 turno. `turnSpent` é o que decide, NÃO
    // `success`: falha por dano moderado (`failed_load`) gasta o turno — é a
    // penalidade da mecânica, não uma recusa.
    case 'load_tube': {
      if (action.tubeId === undefined) return reject('Tubo não informado.')
      const res = loadTube(state, action.tubeId, rng)
      if (!res.turnSpent) return reject(`Carregamento: ${res.reason}`)
      events.push({
        type: 'tube_ops',
        text: res.success
          ? `Tubo ${action.tubeId} carregado.`
          : `Falha no carregamento do tubo ${action.tubeId} — turno perdido.`,
      })
      return ok()
    }

    case 'unload_tube': {
      if (action.tubeId === undefined) return reject('Tubo não informado.')
      const res = unloadTube(state, action.tubeId, rng)
      if (!res.turnSpent) return reject(`Descarregamento: ${res.reason}`)
      events.push({
        type: 'tube_ops',
        text: res.success
          ? `Tubo ${action.tubeId} descarregado.`
          : `Falha no descarregamento do tubo ${action.tubeId} — turno perdido.`,
      })
      return ok()
    }

    case 'hail': {
      if (!action.targetId) return reject('Nenhum alvo para hail.')
      const res = hailTarget(state, action.targetId, rng)
      if (res.status === 'not_found') return reject('Alvo não encontrado.')
      events.push({
        type: 'hail',
        entityId: action.targetId,
        text: hailLogText(res),
      })
      return ok()
    }

    // Reaquisição manual do Weapons Lock custa 1 turno (decisão #23).
    case 'lock_weapons': {
      if (!acquireWeaponsLock(state)) {
        return reject(
          'Não foi possível travar: SRS desligado, em crítico, ou sem alvo visível.',
        )
      }
      events.push({ type: 'weapons_lock', text: 'Weapons Lock adquirido.' })
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
      events.push({
        type: 'probe',
        text: `Sonda lançada — resolve em ${res.turns} turno(s).`,
      })
      return ok()
    }

    case 'move_impulse': {
      // Movimento intra-setor. Inimigo se move na etapa 3, todo turno agora
      // (`moveHostiles`) — não mais só em resposta a esta ação.
      const target = action.targetCoord
      if (!target || !inGrid(target)) return reject('Destino fora do setor.')
      if (propulsionBlocked(state.subsystems.warp)) {
        return reject('Warp Engines em estado crítico — impulso indisponível.')
      }
      const power = clampImpulsePower(state.impulsePower, state.subsystems.warp)
      if (power <= 0 && !state.boostActive) {
        return reject('Impulse Power em zero.')
      }

      if (rollStall(state.subsystems.warp, rng)) {
        events.push({
          type: 'movement',
          text: 'Motores estagnaram — a nave não avançou.',
        })
        return ok()
      }

      // Potência do dial vira velocidade: células cobertas NESTE turno.
      // Destino mais longe que isso fica em trânsito — engaja de novo.
      const speed = impulseCellsPerTurn(power, state.boostActive)
      const isOccupied = occupancyOf(state.currentSector)
      const move = manualMove(state.position.sector, target, isOccupied, speed)
      if (move.rejected) return reject('Destino fora do setor.')
      // Deslocamento REAL, não o pedido: alimenta a esquiva deste turno. Ficar
      // preso atrás de uma estrela não compra manobra evasiva nenhuma. Boost
      // concede esquiva máxima independente de quanto cobriu.
      state.cellsMovedThisTurn = state.boostActive
        ? 8
        : chebyshev(state.position.sector, move.position)
      state.position.sector = move.position
      const arrived =
        move.position.row === target.row && move.position.col === target.col
      events.push({
        type: 'movement',
        text: move.interrupted
          ? 'Obstáculo no caminho — nave parou curto do destino.'
          : arrived
            ? `Impulso: nave em ${move.position.col},${move.position.row}.`
            : `Impulso: em trânsito, nave em ${move.position.col},${move.position.row}.`,
      })
      return ok({ movedUnderImpulse: true })
    }

    case 'move_warp': {
      // Warp é INTER-quadrante: o destino é uma célula da galáxia, e a
      // ocupação usada pela rota do Auto-Nav é quadrante hostil CONHECIDO.
      const target = action.targetCoord ?? state.destination
      // Viagem já em curso é barrada pelo guard geral de warp, acima.
      if (!target) return reject('Nenhum destino selecionado.')

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

      // A nave sai de alcance NO ATO. Antes ela ficava no quadrante de origem
      // levando fogo a viagem inteira sem poder responder — dano sem decisão,
      // que é o oposto do que esta mudança busca. O reposicionamento acima é a
      // última reação do inimigo; a partir daqui o setor está vazio e a etapa 3
      // não acha ninguém pra atacar.
      state.currentSector = []

      events.push({
        type: 'movement',
        text: `Warp ${plan.trip.warpFactor} engajado — ${plan.trip.turnsRemaining} turno(s) até o destino.`,
      })
      return ok({
        warpTripStarted: {
          warpFactor: plan.trip.warpFactor,
          turns: plan.trip.turnsRemaining,
        },
      })
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
      events.push({
        type: 'landing_party',
        text: 'Equipe de desembarque enviada ao planeta.',
      })
      return ok()
    }

    case 'survey': {
      // Custa mais que a sonda ler a distância porque é 1 turno gasto no
      // LOCAL — mas é MUITO mais barato que a Send Party (3 turnos + equipe
      // imobilizada + risco de perdê-la), pra responder só "vale a pena ir?".
      if (isCritical(state.subsystems.srs)) {
        return reject('SRS em estado crítico — survey indisponível.')
      }
      const planet = state.currentSector.find(
        (e) => e.type === SectorEntityType.PLANET,
      )
      if (!planet) return reject('Nenhum planeta no setor.')

      // Confiabilidade pela MESMA curva de toda falha probabilística por dano
      // (`degradedChance`): 0 até moderado, sobe linear até 0.30 na borda do
      // crítico. Leve = sempre certo; moderado = pode mentir; crítico já foi
      // barrado acima. A mentira nunca se anuncia — reportar "não confiável"
      // não teria risco nenhum, o jogador simplesmente ignoraria.
      const misreport = rng() < degradedChance(state.subsystems.srs)
      const hasDilithium = (planet.dilithiumCharges ?? 0) > 0
      const reportsPresent = misreport ? !hasDilithium : hasDilithium

      events.push({
        type: 'survey',
        text: reportsPresent
          ? 'Survey orbital: leituras indicam depósito de dilítio no planeta.'
          : 'Survey orbital: nenhum traço de dilítio detectado.',
      })
      // NÃO toca `surveyed` nem `dilithiumCharges`: presença é tudo que o
      // Survey revela. Quantidade continua exclusiva da Send Party.
      return ok()
    }

    case 'end_turn':
      return ok()
  }
}

/**
 * Regenera o escudo: `shieldDamageTaken` decai proporcional à energia mantida.
 *
 * A spec de `shields` sempre disse "absorption **and regen**" e a metade do
 * regen nunca existiu — nada no projeto reduzia `shieldDamageTaken`, nem
 * atracar. Não era regeneração faltando, era dano permanente por construção, e
 * a 4ª rodada pegou ("a regeneração dos escudos está ativa? Não me pareceu").
 *
 * Segurar escudo alto custa vazão todo turno **e** compra recuperação —
 * coerente com energia ser fluxo, não estoque. Shield Control danificado
 * degrada a taxa pelas mesmas faixas de dano do resto do jogo, e em crítico
 * para de vez.
 */
export function regenShields(state: GameState): void {
  if (state.shieldDamageTaken <= 0) return
  if (isCritical(state.subsystems.shields)) return

  // Interpolação linear: 100% da taxa com escudo em 0, `SHIELD_REGEN_FLOOR_FRACTION`
  // com escudo no teto — invertido do que a energia mantida sugeriria.
  const energyFraction = state.shieldEnergy / SHIELD_ENERGY_MAX
  const rateFraction =
    1 - (1 - SHIELD_REGEN_FLOOR_FRACTION) * clamp(energyFraction, 0, 1)
  const efficiency = 1 - damageFraction(state.subsystems.shields)
  const regen = SHIELD_REGEN_RATE * rateFraction * efficiency
  state.shieldDamageTaken = Math.max(0, state.shieldDamageTaken - regen)
}

/**
 * Atualiza a contagem regressiva de asfixia do Life Support:
 * - Se integridade < 40: inicia em 5 (se ainda não iniciado) ou decrementa em 1.
 * - Se integridade >= 40: limpa a contagem (null).
 */
export function updateLifeSupportCountdown(state: GameState): void {
  if (state.subsystems.life < CRITICAL_INTEGRITY) {
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
  events: TurnEventDraft[]
  dockedBaseDestroyed: boolean
} {
  let damageTaken = 0
  let subsystemDamageTaken = false
  const events: TurnEventDraft[] = []
  let dockedBaseDestroyed = false

  // Movimento deliberado ANTES do ataque: o inimigo se posiciona (aproxima com
  // energia, evade sem) e ataca da posição nova, mesmo turno — mesma ordem do
  // 1978 (reposicionar, depois atacar). Roda TODO turno agora, não só quando o
  // jogador engaja movimento (ver `moveHostiles`).
  moveHostiles(state)

  // O tick de estresse de cloak NÃO mora aqui: `tickCloakStress` já percorre
  // `currentSector` inteiro, e chamá-la dentro de um laço sobre as entidades
  // fazia o estresse de TODOS subir 1× por raider cloacado — com 2 raiders,
  // dobrava. O `resolvePlayerTurn` chama uma vez, na etapa 3.

  // Todo hostil do setor participa — cloacado e sem energia não atacam, mas
  // ainda recarregam (turno ocioso é o que devolve energia).
  const hostiles = state.currentSector.filter((e) => isEnemyType(e.type))
  for (const enemy of hostiles) {
    const power = enemy.enemyPower ?? 0
    const energy = enemy.enemyEnergy ?? 0
    const recharge = () => {
      enemy.enemyEnergy = Math.min(ENEMY_ENERGY_MAX, energy + ENEMY_ENERGY_RECHARGE)
    }

    if (power <= 0) continue
    // Cloacado não ataca (mecânica do Cloaked Raider) — mas segue recarregando.
    if (enemy.cloaked) {
      recharge()
      continue
    }
    // Sem energia pro custo do disparo: segura o fogo e recarrega. Substitui o
    // auto-dreno de 1978 (`enemyPower = floor(power/(3+rng))`), que zerava o
    // próprio poder em ~5 ataques e virava zumbi — nunca atacava, nunca
    // morria sozinho, por fora do escudo (5ª rodada, itens 23.3 e 9.4).
    if (energy < ENEMY_ATTACK_COST) {
      recharge()
      continue
    }

    // Cobertura vale nos DOIS sentidos — se estrela/planeta barra o feixe do
    // jogador, barra o do inimigo. Cobertura de mão única seria vantagem
    // disfarçada de mecânica. Tiro barrado nunca sai: recarrega.
    if (obstaclesBetween(state.currentSector, enemy.position, state.position.sector) > 0) {
      recharge()
      continue
    }

    // Chegou até aqui: o disparo é tentado, e custa energia — mesmo que erre
    // por esquiva do alvo logo abaixo. "Atacar" é tentar, não acertar.
    enemy.enemyEnergy = energy - ENEMY_ATTACK_COST

    // Mesma atenuação por distância que o tiro do jogador sofre. Substitui o
    // `power / distânciaEuclidiana` do fonte de 1978: uma régua só pros dois
    // lados, na mesma tabela de balanceamento.
    const dist = chebyshev(state.position.sector, enemy.position)
    const H = Math.floor(power * damageFalloff(dist) * (2 + rng()))
    if (H <= 0) continue

    // Nave em movimento é alvo difícil. `cellsMovedThisTurn` do jogador é
    // zerado no início da resolução, então parar nunca esquiva.
    if (rng() < evasionChance(state.cellsMovedThisTurn ?? 0)) {
      events.push({
        type: 'enemy_attack',
        entityId: enemy.id,
        at: { ...enemy.position },
        amount: 0,
        text: 'Ataque inimigo passou de raspão — nave em manobra evasiva.',
      })
      continue
    }

    // Evento do DISPARO, antes do efeito. É o que a apresentação usa pra
    // desenhar a linha saindo do inimigo — sem ele, o jogador só via o
    // resultado ("escudos absorveram X") e nunca quem agiu, que é justamente a
    // queixa que originou esta mudança.
    events.push({
      type: 'enemy_attack',
      entityId: enemy.id,
      at: { ...enemy.position },
      amount: H,
      text: `Inimigo atacou com ${H} de dano.`,
    })

    if (options.redirectDamageToDockedBase && state.dockedBaseId) {
      const base = state.starbases.find((b) => b.id === state.dockedBaseId)
      if (base && !base.destroyed) {
        base.resourcePool = Math.max(0, base.resourcePool - H)
        events.push({
          type: 'shield_absorb',
          entityId: base.id,
          amount: H,
          text: `Base atracada absorveu ${H} de dano inimigo.`,
        })
        if (base.resourcePool === 0) {
          base.destroyed = true
          dockedBaseDestroyed = true
          events.push({
            type: 'hull_damage',
            entityId: base.id,
            text: `A base atracada foi destruída pelos ataques inimigos!`,
          })
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
        events.push({
          type: 'shield_absorb',
          entityId: enemy.id,
          at: { ...state.position.sector },
          amount: H,
          text: `Escudos absorveram ${H} de dano.`,
        })
      } else {
        const remainder = H - state.shieldEnergy
        state.shieldDamageTaken += state.shieldEnergy
        state.shieldEnergy = 0
        const hullLoss = remainder / HULL_DAMAGE_DIVISOR
        state.hullIntegrity = Math.max(0, state.hullIntegrity - hullLoss)
        events.push({
          type: 'hull_damage',
          entityId: enemy.id,
          at: { ...state.position.sector },
          amount: hullLoss,
          text: `Escudos saturados — casco perdeu ${hullLoss.toFixed(1)} de integridade.`,
        })
      }

      // Dano aleatório a subsistema se hit forte (H >= 20)
      if (H >= 20 && rng() < 0.6 && H / Math.max(1, state.shieldEnergy) > 0.02) {
        const subIndex = Math.floor(rng() * SUBSYSTEM_KEYS.length)
        const subKey = SUBSYSTEM_KEYS[subIndex]
        const dmg = H / Math.max(1, state.shieldEnergy) + 0.5 * rng()
        state.subsystems[subKey] = Math.max(0, state.subsystems[subKey] - dmg)
        subsystemDamageTaken = true
        events.push({
          type: 'subsystem_hit',
          at: { ...state.position.sector },
          amount: dmg,
          text: `Subsistema atingido: ${subKey} sofreu dano de combate.`,
        })
      }
    }

    // `enemyPower` NÃO cai por atacar — só por dano do jogador (via
    // `applyHostileDamage`, que passa pelo escudo). Ver `ENEMY_ENERGY_MAX`.
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

  // Deslocamento do turno anterior não conta pra esquiva deste. Zerar aqui, no
  // topo da resolução, é o que garante que ficar parado nunca esquiva.
  state.cellsMovedThisTurn = 0
  for (const entity of state.currentSector) entity.cellsMovedThisTurn = 0

  // ── ETAPA 1: Ação do jogador ─────────────────────────────────────────────
  const outcome = applyPlayerAction(state, action, rng)
  if (outcome.rejected) {
    // Recusa NÃO consome turno: nada avança, nenhum tick roda, o inimigo não
    // responde. É o que impede ação declarada de gastar turno fazendo nada.
    return rejectedTurn(state, outcome.reason)
  }

  const events: TurnEvent[] = stamp(1, outcome.events)
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
  // Correr forte cobra, e o jogador precisa SABER que cobrou. Cinco travessias
  // em warp 8 custavam 1% de integridade sem uma linha no log — custo que não é
  // sentido nem reportado não é custo (4ª rodada, item 5.7).
  if (stress > 0 && wcRes.damage > 0) {
    events.push({
      step: 2,
      type: 'warp_core',
      amount: wcRes.damage,
      text: `Warp ${state.warpTrip?.warpFactor} estressa o núcleo: −${wcRes.damage.toFixed(1)} de integridade.`,
    })
  }
  if (wcRes.breachStarted) {
    state.breach = startBreach()
    events.push({
      step: 2,
      type: 'breach',
      text: 'ALERTA: Vazamento de radiação no Warp Core iniciado!',
    })
  }

  const breachRes = resolveBreachTurn(state)
  if (breachRes.contained) {
    events.push({ step: 2, type: 'breach', text: 'Vazamento de radiação contido.' })
  } else if (breachRes.expired) {
    events.push({
      step: 2,
      type: 'breach',
      text: 'CRÍTICO: contenção falhou — exposição letal à radiação.',
    })
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
  events.push(...stamp(3, enemyRes.events))

  // ── ETAPA 4: Condições terminais ─────────────────────────────────────────
  updateLifeSupportCountdown(state)
  const endRes = evaluateEndGame(state, {
    warpCoreExploded: wcRes.exploded,
    dockedBaseDestroyed: enemyRes.dockedBaseDestroyed,
  })

  // ── ETAPA 5: Log e atualização de domínios ───────────────────────────────
  state.stardate += STARDATE_PER_TURN

  regenShields(state)

  const dcRes = resolveDamageControlTurn(state)
  for (const [sys, amount] of Object.entries(dcRes.repairs)) {
    if (amount > 0) {
      events.push({
        step: 5,
        type: 'repair',
        amount,
        text: `Reparo em ${sys}: +${amount}.`,
      })
    }
  }

  const navRes = resolveNavigationTurn(
    state,
    {
      movedUnderImpulse: outcome.movedUnderImpulse,
      quadrantOccupied: knownHostileQuadrants(state),
    },
    rng
  )
  events.push(...stamp(5, navRes.events))

  const combatRes = resolveCombatTurn(
    state,
    { firedPhasers: outcome.fired && action.type === 'fire_phasers' },
    rng,
  )
  events.push(...stamp(5, combatRes.events))

  const autoLoaded = autoLoadTubes(state, rng)
  for (const { tubeId } of autoLoaded) {
    events.push({
      step: 5,
      type: 'tube_ops',
      text: `Tubo ${tubeId}: autoload carregou torpedo.`,
    })
  }

  const partyRes = resolveLandingPartyTurn(state, rng)
  if (partyRes.completed) {
    events.push({
      step: 5,
      type: 'landing_party_report',
      amount: partyRes.boost,
      text: partyRes.destroyed
        ? 'Equipe de desembarque perdida em setor hostil.'
        : partyRes.boost > 0
          ? `Dilítium recuperado: +${partyRes.boost} de integridade no Warp Core.`
          : 'Equipe retornou — planeta estéril, nenhum dilítium.',
    })
  }

  regenStarbasePools(state.starbases, state.docked ? state.dockedBaseId : null)

  // Troca de quadrante notifica o hook 1×, depois do movimento resolver.
  if (!sameQuadrant(quadrantBefore, state.position.quadrant)) {
    options.onQuadrantEnter?.(state, state.position.quadrant)
    settleShipCell(state)
  }

  // DEPOIS do hook: se a nave trocou de quadrante neste turno, `currentSector`
  // só reflete o setor novo a partir daqui — checar antes leria o setor velho.
  updateAlertLevel(state)

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
    warpTripStarted: outcome.warpTripStarted,
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
    events: reason ? [{ step: 1, type: 'rejection', text: reason }] : [],
    damageTaken: 0,
    subsystemDamageTaken: false,
    breachStarted: false,
    newEnemiesEncountered: false,
    missionCompleted: false,
    terminalReason: null,
    warpCoreExploded: false,
    warpTripStarted: null,
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
