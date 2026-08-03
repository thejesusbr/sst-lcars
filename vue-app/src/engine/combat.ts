/**
 * Combat: dano de phasers/torpedos, alvos em `currentSector`,
 * contra-ataque Klingon, Hail (rendição/captura), interrogatório e Cloaked Raider.
 *
 * Importa SÓ de `types/game.ts` e `engine/constants.ts` (design.md decisão #36).
 * TS puro, sem Vue/Pinia. Parâmetro `rng` opcional para determinismo nos testes.
 */

import {
  CLOAK_COOLDOWN_TURNS,
  CLOAK_STRESS_CAP,
  CLOAK_STRESS_PER_TURN,
  ENEMY_ATTACK_COST,
  ENEMY_MOVE_CELLS,
  EVASION_PER_CELL,
  INTERROGATION_CHANCE,
  PHASER_DAMAGE_PER_POWER,
  PHASER_POWER_DEFAULT,
  PHASER_TEMP_MAX,
  PHASER_TEMP_PER_SHOT,
  TORPEDO_DAMAGE_MIN,
  TORPEDO_DAMAGE_SPREAD,
  TORPEDO_OBSTRUCTION_MISS,
  TORPEDO_STOCK_MAX,
  clamp,
  damageFalloff,
  damageFraction,
  degradedChance,
  hailSurrenderChance,
  liveKbsCode,
  isCritical,
  round4,
} from '@/engine/constants'
import type {
  GameState,
  GridCoord,
  SectorEntity,
  StarbaseType,
  TurnEventDraft,
} from '@/types/game'
import {
  cellKey,
  chebyshev,
  getVisibleEnemies,
  isEnemyType,
  isStarbaseType,
  obstaclesBetween,
} from '@/engine/sector'
import { pickHailRefusal } from '@/engine/hailRefusals'

// ── Phasers (seções 2.3 e specs de Combat) ──────────────────────────────────

export interface PhaserFireResult {
  success: boolean
  reason?: 'no_lock' | 'critical_damage' | 'no_energy' | 'no_targets'
  powerCommitted: number
  totalDamageDealt: number
  /** `position` é a célula do alvo NO DISPARO — depois do abate ele some do setor. */
  hits: {
    enemyId: string
    position: GridCoord
    damage: number
    destroyed: boolean
    /** Obstáculo na linha reta barrou o feixe. */
    blocked?: boolean
    /** Alvo em movimento se esquivou. */
    evaded?: boolean
  }[]
}

/**
 * Chance de esquiva de quem cobriu `cells` células neste turno.
 *
 * Velocidade era só duração de travessia; amarrar esquiva a ela dá ao dial de
 * impulso uma consequência defensiva — que é o que faltava pra ele ter 100
 * posições em vez de 4 resultados úteis.
 */
export function evasionChance(cells: number): number {
  return Math.max(0, Math.min(0.9, cells * EVASION_PER_CELL))
}

/**
 * Aplica dano num hostil: o escudo come primeiro, o excedente transborda pro
 * `enemyPower`. Fonte única — phaser e torpedo têm que concordar.
 */
export function applyHostileDamage(
  state: GameState,
  enemy: SectorEntity,
  damage: number,
): { destroyed: boolean; absorbed: number } {
  const shield = enemy.enemyShield ?? 0
  const absorbed = Math.min(shield, damage)
  enemy.enemyShield = shield - absorbed

  const spill = damage - absorbed
  if (spill <= 0) return { destroyed: false, absorbed }

  const remaining = (enemy.enemyPower ?? 0) - spill
  if (remaining <= 0) {
    removeEnemyFromSector(state, enemy.id, 'destroyed')
    return { destroyed: true, absorbed }
  }
  enemy.enemyPower = remaining
  return { destroyed: false, absorbed }
}

/**
 * Dispara os bancos de phaser dividindo a energia por igual entre os inimigos
 * visíveis e travados por Weapons Lock.
 */
export function firePhasers(
  state: GameState,
  requestedPower: number,
  rng = Math.random
): PhaserFireResult {
  const phaserIntegrity = state.subsystems.phasers
  if (isCritical(phaserIntegrity)) {
    return { success: false, reason: 'critical_damage', powerCommitted: 0, totalDamageDealt: 0, hits: [] }
  }
  if (!state.weaponsLocked) {
    return { success: false, reason: 'no_lock', powerCommitted: 0, totalDamageDealt: 0, hits: [] }
  }

  // Sem gate de estoque: energia é vazão. O disparo sempre sai na potência
  // escolhida; o preço é o consumo daquele turno entrar em `subsystemDraw` e
  // poder estourar o que o Warp Core gera — sobrecarga, não recusa.
  const availablePower = requestedPower
  if (availablePower <= 0) {
    return { success: false, reason: 'no_energy', powerCommitted: 0, totalDamageDealt: 0, hits: [] }
  }

  const visibleEnemies = getVisibleEnemies(state)
  if (visibleEnemies.length === 0) {
    return { success: false, reason: 'no_targets', powerCommitted: 0, totalDamageDealt: 0, hits: [] }
  }

  const d = damageFraction(phaserIntegrity)

  // Aquecimento segue Joule (Q = I²Rt): cresce com o QUADRADO da potência
  // disparada, não linear. A 1ª versão era `30 × (potência/1500) × (1+d)`, que
  // dava só 2× de calor a 3000 contra 1500 — a 5ª rodada pediu o modelo físico
  // de verdade, que dá 4×. Normalizado em `PHASER_POWER_DEFAULT` pra que a
  // potência padrão mantenha os 30 de sempre e só o topo do dial morda.
  const heatGain = round4(
    PHASER_TEMP_PER_SHOT * (availablePower / PHASER_POWER_DEFAULT) ** 2 * (1 + d),
  )
  state.phaserTemp = clamp(state.phaserTemp + heatGain, 0, PHASER_TEMP_MAX)

  // Efetividade por calor: max(0, 100 - phaserTemp / 2.7) / 100
  const heatEffectiveness = Math.max(0, 100 - state.phaserTemp / 2.7) / 100
  const damageMultiplier = round4((1 - d) * heatEffectiveness)

  const share = availablePower / visibleEnemies.length
  let totalDamageDealt = 0
  const hits: PhaserFireResult['hits'] = []

  for (const enemy of visibleEnemies) {
    // Estrela ou planeta na linha reta barra o feixe. O phaser viaja reto — é o
    // vocabulário visual que a apresentação já desenha — então cobertura é
    // cobertura, e vale nos dois sentidos (o inimigo sofre a mesma regra).
    if (obstaclesBetween(state.currentSector, state.position.sector, enemy.position) > 0) {
      hits.push({
        enemyId: enemy.id,
        position: { ...enemy.position },
        damage: 0,
        destroyed: false,
        blocked: true,
      })
      continue
    }

    // Alvo que se moveu neste turno é mais difícil de acertar. Simétrico: o
    // inimigo reposiciona sempre que o jogador engaja movimento.
    if (rng() < evasionChance(enemy.cellsMovedThisTurn ?? 0)) {
      hits.push({
        enemyId: enemy.id,
        position: { ...enemy.position },
        damage: 0,
        destroyed: false,
        evaded: true,
      })
      continue
    }

    // Dano é FRAÇÃO da potência, atenuada pela distância — não mais ~igual à
    // potência comprometida, que dava overkill de 4x a 18x.
    const dist = chebyshev(state.position.sector, enemy.position)
    const baseDamage =
      share * PHASER_DAMAGE_PER_POWER * damageFalloff(dist) * (0.8 + rng() * 0.4)
    const finalDamage = Math.round(baseDamage * damageMultiplier)

    const { destroyed } = applyHostileDamage(state, enemy, finalDamage)

    totalDamageDealt += finalDamage
    hits.push({
      enemyId: enemy.id,
      position: { ...enemy.position },
      damage: finalDamage,
      destroyed,
    })
  }

  return {
    success: true,
    powerCommitted: availablePower,
    totalDamageDealt,
    hits,
  }
}

/** Resfriamento passivo dos phasers em turnos sem disparo. */
export function passivePhaserCooldown(state: GameState): void {
  const d = damageFraction(state.subsystems.phasers)
  const coolAmount = round4(PHASER_TEMP_PER_SHOT * (1 - d))
  state.phaserTemp = Math.max(0, state.phaserTemp - coolAmount)
}

// ── Torpedos (seções 2.3 e specs de Combat) ─────────────────────────────────

export interface TorpedoFireResult {
  success: boolean
  reason?: 'critical_damage' | 'subsystem_off' | 'no_loaded_tubes'
  shotsFired: number
  hits: {
    tubeId: number
    enemyId: string
    position: GridCoord
    damage: number
    destroyed: boolean
    /** Errou: obstáculo na trajetória ou alvo em movimento. */
    missed?: boolean
  }[]
}

/**
 * Dispara os torpedos de cada tubo carregado contra o seu alvo mapeado (`targetId`).
 */
export function fireTorpedoes(
  state: GameState,
  rng = Math.random
): TorpedoFireResult {
  if (isCritical(state.subsystems.photons)) {
    return { success: false, reason: 'critical_damage', shotsFired: 0, hits: [] }
  }
  if (!state.subsystemsOn.photons) {
    return { success: false, reason: 'subsystem_off', shotsFired: 0, hits: [] }
  }

  const loadedTubes = state.tubes.filter((t) => t.loaded && t.targetId)
  if (loadedTubes.length === 0) {
    return { success: false, reason: 'no_loaded_tubes', shotsFired: 0, hits: [] }
  }

  const d = damageFraction(state.subsystems.photons)
  const damageMultiplier = 1 - d
  let shotsFired = 0
  const hits: TorpedoFireResult['hits'] = []

  for (const tube of loadedTubes) {
    if (!tube.targetId) continue
    const target = state.currentSector.find((e) => e.id === tube.targetId)

    // Se o alvo não existe mais ou está cloacado, o tubo é limpo e não dispara
    if (!target || target.cloaked || !isEnemyType(target.type)) {
      tube.targetId = null
      continue
    }

    tube.loaded = false
    shotsFired++
    state.torpedoesUsed++

    // Torpedo é guiado: passa pela cobertura que barra o phaser. Mas corrigir
    // trajetória no calor da batalha é difícil, então cada obstáculo na linha
    // acrescenta chance de errar, acumulando com a degradação de Photon Tubes.
    const obstacles = obstaclesBetween(
      state.currentSector,
      state.position.sector,
      target.position,
    )
    const missChance = obstacles * TORPEDO_OBSTRUCTION_MISS
    const evaded = rng() < evasionChance(target.cellsMovedThisTurn ?? 0)
    if (evaded || (missChance > 0 && rng() < missChance)) {
      hits.push({
        tubeId: tube.id,
        enemyId: target.id,
        position: { ...target.position },
        damage: 0,
        destroyed: false,
        missed: true,
      })
      continue
    }

    const rawDamage =
      TORPEDO_DAMAGE_MIN + round4(rng() * TORPEDO_DAMAGE_SPREAD)
    const finalDamage = Math.round(rawDamage * damageMultiplier)

    const { destroyed } = applyHostileDamage(state, target, finalDamage)

    hits.push({
      tubeId: tube.id,
      enemyId: target.id,
      position: { ...target.position },
      damage: finalDamage,
      destroyed,
    })
  }

  return {
    success: shotsFired > 0,
    shotsFired,
    hits,
  }
}

/**
 * Requisita carregamento de um tubo — ação LIVRE (não custa turno), como
 * `dispatchTeam`. Marca `loadPending`; quem completa é `resolvePendingTubeLoads`,
 * no fim da resolução do turno em curso — pronto pro turno seguinte.
 *
 * Antes disparar isto custava 1 turno inteiro parado (`load_tube` no
 * `turnEngine`): 3 tubos = 3 turnos sem atirar, e uma salva de 3 turnos levava
 * 3× o escudo de dano que o mesmo tempo atirando phaser causaria (achado
 * medido na 6ª rodada, item 30.1) — a mecânica era uma armadilha, não só lenta.
 */
export function requestTubeLoad(
  state: GameState,
  tubeId: number,
  rng = Math.random
): { success: boolean; reason?: string } {
  if (isCritical(state.subsystems.photons)) {
    return { success: false, reason: 'critical_damage' }
  }
  const tube = state.tubes.find((t) => t.id === tubeId)
  if (!tube) return { success: false, reason: 'invalid_tube' }
  if (tube.loaded || tube.loadPending) return { success: false, reason: 'already_loaded' }
  if (state.torpedoStock <= 0) {
    return { success: false, reason: 'out_of_stock' }
  }

  // Falha probabilística a partir de dano moderado. Sem custo de turno pra
  // errar também: a falha só significa "tenta nesse tubo de novo".
  const failChance = degradedChance(state.subsystems.photons)
  if (failChance > 0 && rng() * 100 < failChance) {
    return { success: false, reason: 'failed_load' }
  }

  tube.loadPending = true
  state.torpedoStock = Math.max(0, state.torpedoStock - 1)
  return { success: true }
}

/**
 * Completa toda requisição de carregamento pendente — chamada 1x por
 * resolução de turno (`turnEngine`, etapa 5), logo depois de `autoLoadTubes`.
 * Cobre os dois caminhos: um pedido manual feito ANTES desta resolução
 * (pronto agora, pro turno seguinte) e um autoload que `autoLoadTubes` acabou
 * de marcar nesta mesma chamada (completa na hora, mesmo comportamento de
 * sempre — autoload nunca teve custo de turno pro jogador).
 */
export function resolvePendingTubeLoads(state: GameState): { tubeId: number }[] {
  const completed: { tubeId: number }[] = []
  for (const tube of state.tubes) {
    if (!tube.loadPending) continue
    tube.loaded = true
    tube.loadPending = false
    completed.push({ tubeId: tube.id })
  }
  return completed
}

/** Descarrega um tubo de torpedo de volta ao estoque (custa 1 turno). */
export function unloadTube(
  state: GameState,
  tubeId: number,
  rng = Math.random
): { success: boolean; turnSpent: boolean; reason?: string } {
  if (isCritical(state.subsystems.photons)) {
    return { success: false, turnSpent: false, reason: 'critical_damage' }
  }
  const tube = state.tubes.find((t) => t.id === tubeId)
  if (!tube) return { success: false, turnSpent: false, reason: 'invalid_tube' }
  if (!tube.loaded) return { success: false, turnSpent: false, reason: 'not_loaded' }

  const failChance = degradedChance(state.subsystems.photons)
  if (failChance > 0 && rng() * 100 < failChance) {
    return { success: false, turnSpent: true, reason: 'failed_unload' }
  }

  tube.loaded = false
  state.torpedoStock = Math.min(TORPEDO_STOCK_MAX, state.torpedoStock + 1)
  return { success: true, turnSpent: true }
}

/**
 * Autoload: tubo com o toggle ligado pede carregamento sozinho, sem gastar a
 * ação do jogador — mesmas regras de falha/estoque/dano de `requestTubeLoad`,
 * só que disparado pelo motor. `resolvePendingTubeLoads`, chamada logo depois
 * na mesma resolução (`turnEngine`), completa o pedido na hora — autoload
 * nunca teve o atraso de 1 turno que o pedido manual agora tem.
 */
export function autoLoadTubes(
  state: GameState,
  rng = Math.random
): { tubeId: number }[] {
  const loaded: { tubeId: number }[] = []
  for (const tube of state.tubes) {
    if (!tube.autoLoad || tube.loaded || tube.loadPending) continue
    const res = requestTubeLoad(state, tube.id, rng)
    if (res.success) loaded.push({ tubeId: tube.id })
  }
  return loaded
}

/**
 * Cicla o alvo do tubo para o próximo inimigo detectado em `currentSector`.
 */
export function cycleTorpedoTarget(state: GameState, tubeId: number): void {
  const tube = state.tubes.find((t) => t.id === tubeId)
  if (!tube) return

  const visibleEnemies = getVisibleEnemies(state)
  if (visibleEnemies.length === 0) {
    tube.targetId = null
    return
  }

  if (!tube.targetId) {
    tube.targetId = visibleEnemies[0].id
    return
  }

  const idx = visibleEnemies.findIndex((e) => e.id === tube.targetId)
  if (idx === -1) {
    tube.targetId = visibleEnemies[0].id
  } else {
    const nextIdx = (idx + 1) % visibleEnemies.length
    tube.targetId = visibleEnemies[nextIdx].id
  }
}

// ── Weapons Lock & Sensores ─────────────────────────────────────────────────

/**
 * Verifica e atualiza o estado de Weapons Lock:
 * - Auto-trava ao entrar em setor hostil com inimigo visível.
 * - Chance de perder trava por dano em SRS: (100 - srsIntegrity) * 0.5% / turno.
 */
export function checkWeaponsLock(state: GameState, rng = Math.random): void {
  const visibleEnemies = getVisibleEnemies(state)
  if (visibleEnemies.length === 0 || !state.subsystemsOn.srs) {
    state.weaponsLocked = false
    return
  }

  const srsIntegrity = state.subsystems.srs
  if (srsIntegrity < 100 && state.weaponsLocked) {
    const dropChance = (100 - srsIntegrity) * 0.005
    if (rng() < dropChance) {
      state.weaponsLocked = false
      return
    }
  }

  if (visibleEnemies.length > 0 && state.subsystemsOn.srs) {
    state.weaponsLocked = true
  }
}

/** Reaquisição manual do Weapons Lock (custa 1 turno). */
export function acquireWeaponsLock(state: GameState): boolean {
  if (!state.subsystemsOn.srs || isCritical(state.subsystems.srs)) {
    return false
  }
  const visibleEnemies = getVisibleEnemies(state)
  if (visibleEnemies.length === 0) {
    return false
  }
  state.weaponsLocked = true
  return true
}

// ── Reposicionamento em movimento do jogador ────────────────────────────────

/**
 * Movimento DELIBERADO de cada inimigo visível, uma vez por resolução de
 * turno: aproxima do jogador se tem energia pra atacar, evade se não tem.
 *
 * Substitui o reposicionamento aleatório (teleporte pra célula sorteada do
 * setor, disparado só quando o JOGADOR engajava movimento). Com atenuação por
 * distância em jogo, teleporte zerava fuga como tática — a 5ª rodada correu 7
 * células a impulso máximo e encontrou o inimigo à queima-roupa de novo no
 * mesmo turno. Agora roda TODO turno (etapa 3), e a decisão usa a energia de
 * ENTRADA do turno — ou seja, reage ao estado de 1 turno atrás, não ao que o
 * jogador acabou de fazer.
 *
 * `Cloaked Raider` cloacado não se move — ele só acumula estresse (decisão
 * #17), preservado de antes.
 */
export function moveHostiles(state: GameState): void {
  const player = state.position.sector
  const occupied = new Set(
    state.currentSector.map((e) => cellKey(e.position)),
  )
  occupied.add(cellKey(player))

  for (const enemy of getVisibleEnemies(state)) {
    const origin = { ...enemy.position }
    occupied.delete(cellKey(origin))

    const approaching = (enemy.enemyEnergy ?? 0) >= ENEMY_ATTACK_COST
    const rowDist = player.row - origin.row
    const colDist = player.col - origin.col

    // Passo decrescente: 3, 2, 1, 0. Aproximando, o passo por eixo é CAPADO
    // pela distância real àquele eixo — sem isso, um inimigo a 1 célula de
    // distância seria empurrado 3 células e ultrapassaria o jogador pro lado
    // oposto (a distância aumentaria em vez de cair). O `0` final garante
    // fallback: ficar parado é sempre livre, porque a própria célula saiu de
    // `occupied` acima.
    let landed = origin
    for (let step = ENEMY_MOVE_CELLS; step >= 0; step--) {
      const dRow = approaching
        ? Math.sign(rowDist) * Math.min(step, Math.abs(rowDist))
        : Math.sign(rowDist) * -step
      const dCol = approaching
        ? Math.sign(colDist) * Math.min(step, Math.abs(colDist))
        : Math.sign(colDist) * -step
      const next = {
        row: clamp(origin.row + dRow, 1, 8),
        col: clamp(origin.col + dCol, 1, 8),
      }
      if (!occupied.has(cellKey(next))) {
        landed = next
        break
      }
    }

    enemy.position = landed
    // Inimigo que se moveu também é alvo em movimento — a esquiva é simétrica,
    // e é o que explica por que perseguir custa caro.
    enemy.cellsMovedThisTurn = chebyshev(origin, landed)
    occupied.add(cellKey(landed))
  }
}

// ── Tick de fim de turno ────────────────────────────────────────────────────

export interface CombatTurnResult {
  /** Trava perdida neste turno por dano no SRS. */
  lockLost: boolean
  events: TurnEventDraft[]
}

/**
 * Tick de fim de turno de combate: resfriamento passivo dos phasers (só em turno
 * sem disparo) e o roll de perda de Weapons Lock por dano no SRS.
 *
 * Existe pra o `turnEngine` ter UMA chamada por turno em vez de espalhar as
 * duas — as duas estavam implementadas e nunca invocadas (proposal, lacunas 5 e 6).
 */
export function resolveCombatTurn(
  state: GameState,
  options: { firedPhasers?: boolean } = {},
  rng = Math.random,
): CombatTurnResult {
  const events: TurnEventDraft[] = []

  if (!options.firedPhasers) {
    passivePhaserCooldown(state)
  }

  const wasLocked = state.weaponsLocked
  checkWeaponsLock(state, rng)
  const lockLost = wasLocked && !state.weaponsLocked
  if (lockLost) {
    events.push({
      type: 'weapons_lock',
      text: 'Weapons Lock perdido — sensores de curto alcance degradados.',
    })
  }

  return { lockLost, events }
}

// ── Hail (Rendições e Capturas) ─────────────────────────────────────────────

export interface HailResult {
  success: boolean
  status: 'surrender' | 'base_status' | 'rejected' | 'full_brig' | 'not_found'
  revealedBasePool?: number
  /** O dado que decide se a viagem vale a pena — sem ele, um pool sozinho não diz nada. */
  revealedBaseType?: StarbaseType
  /** Vai pro combat log: "a base respondeu" sem coordenada é inútil dois turnos depois. */
  revealedBaseQuadrant?: GridCoord
  intelRevealed?: boolean
  /** Presente só em `status: 'rejected'` — a recusa que confirma que o hail aconteceu. */
  refusalText?: string
}

/**
 * Envia mensagem Hail para um alvo no setor atual.
 *
 * `targetId` pode ser qualquer entidade do setor — inimigo ou base — não
 * apenas uma na célula que o jogador selecionou no scanner: hail não é arma,
 * não tem por que exigir precisão espacial (design.md decisão 1). A
 * disambiguação entre múltiplos alvos válidos é responsabilidade da UI, não
 * deste engine escolher sozinho.
 *
 * - Rendição escala com o dano do alvo (`hailSurrenderChance`): intacto rende
 *   no piso, em farrapos rende bem mais.
 * - Rendição bem-sucedida captura prisioneiro para a cela (capacidade 4).
 * - Interrogatório no momento da captura tem 50% de chance de revelar quadrante inimigo.
 * - Roll falho responde com uma recusa, sorteada no tom da espécie do alvo.
 */
export function hailTarget(
  state: GameState,
  targetId: string,
  rng = Math.random
): HailResult {
  const target = state.currentSector.find((e) => e.id === targetId)
  if (!target || target.cloaked) {
    return { success: false, status: 'not_found' }
  }

  if (isStarbaseType(target.type)) {
    const base = state.starbases.find(
      (b) => b.quadrant.row === state.position.quadrant.row && b.quadrant.col === state.position.quadrant.col
    )
    return {
      success: true,
      status: 'base_status',
      revealedBasePool: base ? base.resourcePool : undefined,
      revealedBaseType: base?.type,
      revealedBaseQuadrant: base ? { ...base.quadrant } : undefined,
    }
  }

  if (isEnemyType(target.type)) {
    if (state.brig.count >= state.brig.capacity) {
      return { success: false, status: 'full_brig' }
    }

    if (rng() < hailSurrenderChance(target.enemyPower ?? 0, target.type)) {
      // `captured` ja soma em `klingonsCaptured` -- nao somar aqui de novo.
      removeEnemyFromSector(state, target.id, 'captured')
      state.brig.count = Math.min(state.brig.capacity, state.brig.count + 1)

      let intelRevealed = false
      if (rng() < INTERROGATION_CHANCE) {
        intelRevealed = revealUnexploredEnemyQuadrant(state, rng)
      }

      return { success: true, status: 'surrender', intelRevealed }
    }

    return {
      success: false,
      status: 'rejected',
      refusalText: pickHailRefusal(target.type, rng),
    }
  }

  return { success: false, status: 'not_found' }
}

/**
 * Tira o inimigo do setor de vez.
 *
 * **Grava a baixa no quadrante da galáxia** (`clearedEnemies`), não só no setor
 * atual. Sem isso o inimigo ressuscitava: `materializeSector` calcula
 * `klingons - clearedEnemies` ao entrar num quadrante, e como nada incrementava
 * o contador, sair e voltar repovoava o setor com os mesmos inimigos — enquanto
 * `enemiesLeft` continuava caindo. Dava pra vencer a partida indo e voltando
 * entre dois setores.
 *
 * `reason` separa baixa de captura: as duas tiram o inimigo do jogo, mas pesam
 * diferente no rating (capturar vale 1.5×). Antes o caminho de rendição chamava
 * esta função (que somava em `klingonsDestroyed`) E somava em
 * `klingonsCaptured` — o mesmo Klingon contava duas vezes.
 */
function removeEnemyFromSector(
  state: GameState,
  enemyId: string,
  reason: 'destroyed' | 'captured',
): void {
  state.currentSector = state.currentSector.filter((e) => e.id !== enemyId)
  state.enemiesLeft = Math.max(0, state.enemiesLeft - 1)

  const quadrantKey = cellKey(state.position.quadrant)
  const quadrant = state.galaxy?.[quadrantKey]
  if (quadrant) {
    quadrant.clearedEnemies = Math.min(
      quadrant.klingons,
      quadrant.clearedEnemies + 1,
    )
    // Sua própria ação atualiza seu próprio mapa, com confiança cheia. O
    // decaimento de confiança modela informação ENVELHECENDO — o quadrante
    // mudou enquanto você estava longe —, não esquecer o que você mesmo fez.
    // Sem isto, sair de um setor recém-limpo faria o Star Chart voltar ao
    // código pré-combate, e o jogador teria que reescanear pra reaprender algo
    // que presenciou.
    state.exploredQuadrants[quadrantKey] = {
      code: liveKbsCode(quadrant),
      age: 0,
    }
  }

  if (reason === 'captured') state.klingonsCaptured++
  else state.klingonsDestroyed++

  for (const tube of state.tubes) {
    if (tube.targetId === enemyId) {
      tube.targetId = null
    }
  }
}

/** Helper de Interrogatório: revela no Star Chart um quadrante não explorado com inimigo. */
function revealUnexploredEnemyQuadrant(
  state: GameState,
  rng = Math.random
): boolean {
  const unrevealedKeys = Object.keys(state.exploredQuadrants).filter((k) => {
    const code = state.exploredQuadrants[k]?.code ?? '000'
    return Number(code[0] ?? 0) > 0 && state.exploredQuadrants[k]?.age !== 0
  })

  if (unrevealedKeys.length === 0) return false
  const pickIdx = Math.floor(rng() * unrevealedKeys.length)
  const key = unrevealedKeys[pickIdx]
  if (state.exploredQuadrants[key]) {
    state.exploredQuadrants[key].age = 0
    return true
  }
  return false
}

// ── Turno Inimigo & Cloaked Raider ──────────────────────────────────────────

/**
 * Tica o estresse de cloaking de todas as naves `Cloaked Raider` em `currentSector`.
 * - Atingir CLOAK_STRESS_CAP (20) força decloak e aplica cooldown de 8 turnos.
 */
export function tickCloakStress(state: GameState): void {
  for (const enemy of state.currentSector) {
    if (enemy.type !== 'cloaked_raider') continue

    if (enemy.cloakCooldown && enemy.cloakCooldown > 0) {
      enemy.cloakCooldown--
    }

    if (enemy.cloaked) {
      enemy.cloakStress = (enemy.cloakStress ?? 0) + CLOAK_STRESS_PER_TURN
      if (enemy.cloakStress >= CLOAK_STRESS_CAP) {
        enemy.cloaked = false
        enemy.cloakStress = 0
        enemy.cloakCooldown = CLOAK_COOLDOWN_TURNS
      }
    }
  }
}

// `resolveEnemyCounterAttacks` foi removida aqui: era código morto (nenhum
// chamador) e uma SEGUNDA implementação de ataque inimigo, com fórmula divergente
// (`0.8 + rnd*0.4`) da que a spec manda e o `turnEngine` usa
// (`H = floor((power/dist) * (2 + rnd))`, linha 3350 do fonte de 1978). Duas
// fórmulas pro mesmo evento é exatamente a classe de armadilha que esta mudança
// existe pra eliminar — a versão do `turnEngine` é a correta.
