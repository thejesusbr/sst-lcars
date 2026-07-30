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
  HAIL_SURRENDER_CHANCE,
  INTERROGATION_CHANCE,
  PHASER_TEMP_MAX,
  PHASER_TEMP_PER_SHOT,
  TORPEDO_DAMAGE_MIN,
  TORPEDO_DAMAGE_SPREAD,
  TORPEDO_STOCK_MAX,
  clamp,
  damageFraction,
  degradedChance,
  isCritical,
  round4,
} from '@/engine/constants'
import type { GameState } from '@/types/game'
import {
  getVisibleEnemies,
  isEnemyType,
  isStarbaseType,
} from '@/engine/sector'

// ── Phasers (seções 2.3 e specs de Combat) ──────────────────────────────────

export interface PhaserFireResult {
  success: boolean
  reason?: 'no_lock' | 'critical_damage' | 'no_energy' | 'no_targets'
  powerCommitted: number
  totalDamageDealt: number
  hits: { enemyId: string; damage: number; destroyed: boolean }[]
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

  // Aquecimento por disparo aumenta com dano no subsistema: 30 * (1 + d)
  const heatGain = round4(PHASER_TEMP_PER_SHOT * (1 + d))
  state.phaserTemp = clamp(state.phaserTemp + heatGain, 0, PHASER_TEMP_MAX)

  // Efetividade por calor: max(0, 100 - phaserTemp / 2.7) / 100
  const heatEffectiveness = Math.max(0, 100 - state.phaserTemp / 2.7) / 100
  const damageMultiplier = round4((1 - d) * heatEffectiveness)

  const share = availablePower / visibleEnemies.length
  let totalDamageDealt = 0
  const hits: { enemyId: string; damage: number; destroyed: boolean }[] = []

  for (const enemy of visibleEnemies) {
    // Fórmula clássica de dano com roll randômico proporcional a share
    const baseDamage = share * (0.8 + rng() * 0.4)
    const finalDamage = Math.round(baseDamage * damageMultiplier)
    const currentPower = enemy.enemyPower ?? 0
    const remaining = currentPower - finalDamage
    const destroyed = remaining <= 0

    if (destroyed) {
      removeEnemyFromSector(state, enemy.id)
    } else {
      enemy.enemyPower = remaining
    }

    totalDamageDealt += finalDamage
    hits.push({ enemyId: enemy.id, damage: finalDamage, destroyed })
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
  hits: { tubeId: number; enemyId: string; damage: number; destroyed: boolean }[]
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
  const hits: { tubeId: number; enemyId: string; damage: number; destroyed: boolean }[] = []

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

    const rawDamage =
      TORPEDO_DAMAGE_MIN + round4(rng() * TORPEDO_DAMAGE_SPREAD)
    const finalDamage = Math.round(rawDamage * damageMultiplier)

    const currentPower = target.enemyPower ?? 0
    const remaining = currentPower - finalDamage
    const destroyed = remaining <= 0

    if (destroyed) {
      removeEnemyFromSector(state, target.id)
    } else {
      target.enemyPower = remaining
    }

    hits.push({
      tubeId: tube.id,
      enemyId: target.id,
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

/** Carrega um tubo de torpedo (custa 1 turno). */
export function loadTube(
  state: GameState,
  tubeId: number,
  rng = Math.random
): { success: boolean; turnSpent: boolean; reason?: string } {
  if (isCritical(state.subsystems.photons)) {
    return { success: false, turnSpent: false, reason: 'critical_damage' }
  }
  const tube = state.tubes.find((t) => t.id === tubeId)
  if (!tube) return { success: false, turnSpent: false, reason: 'invalid_tube' }
  if (tube.loaded) return { success: false, turnSpent: false, reason: 'already_loaded' }
  if (state.torpedoStock <= 0) {
    return { success: false, turnSpent: false, reason: 'out_of_stock' }
  }

  // Falha probabilística a partir de dano moderado
  const failChance = degradedChance(state.subsystems.photons)
  if (failChance > 0 && rng() * 100 < failChance) {
    return { success: false, turnSpent: true, reason: 'failed_load' }
  }

  tube.loaded = true
  state.torpedoStock = Math.max(0, state.torpedoStock - 1)
  return { success: true, turnSpent: true }
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
 * Reposiciona cada inimigo visível pra uma célula desocupada aleatória do setor.
 *
 * **Determinístico**, não probabilístico: só dispara quando a ação do turno é
 * engajar movimento (impulso ou warp), e nunca em Fire/Hail/Lock/End Turn. É o
 * gatilho exato do fonte de 1978, confirmado com o usuário (`fase-4-engine`
 * design.md decisão #21). `Cloaked Raider` cloacado não reposiciona — ele só
 * acumula estresse (decisão #17).
 */
export function repositionEnemies(state: GameState, rng = Math.random): void {
  const taken = new Set(
    state.currentSector.map((e) => `${e.position.row},${e.position.col}`),
  )
  taken.add(`${state.position.sector.row},${state.position.sector.col}`)

  for (const enemy of getVisibleEnemies(state)) {
    const from = `${enemy.position.row},${enemy.position.col}`

    // A célula de origem fica em `taken`: a spec diz célula **nova**, então
    // sortear a própria posição não conta como reposicionar.
    let next = from
    // 64 células; algumas tentativas bastam. Se todas caírem ocupadas, o
    // inimigo fica onde está — não é erro, é setor cheio.
    for (let tries = 0; tries < 24; tries++) {
      const row = Math.floor(rng() * 8) + 1
      const col = Math.floor(rng() * 8) + 1
      const key = `${row},${col}`
      if (!taken.has(key)) {
        enemy.position = { row, col }
        next = key
        taken.delete(from)
        break
      }
    }
    taken.add(next)
  }
}

// ── Tick de fim de turno ────────────────────────────────────────────────────

export interface CombatTurnResult {
  /** Trava perdida neste turno por dano no SRS. */
  lockLost: boolean
  events: string[]
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
  options: { fired?: boolean } = {},
  rng = Math.random,
): CombatTurnResult {
  const events: string[] = []

  if (!options.fired) {
    passivePhaserCooldown(state)
  }

  const wasLocked = state.weaponsLocked
  checkWeaponsLock(state, rng)
  const lockLost = wasLocked && !state.weaponsLocked
  if (lockLost) {
    events.push('Weapons Lock perdido — sensores de curto alcance degradados.')
  }

  return { lockLost, events }
}

// ── Hail (Rendições e Capturas) ─────────────────────────────────────────────

export interface HailResult {
  success: boolean
  status: 'surrender' | 'base_status' | 'rejected' | 'full_brig' | 'not_found'
  revealedBasePool?: number
  intelRevealed?: boolean
}

/**
 * Envia mensagem Hail para um alvo no setor atual.
 * - Inimigos têm 30% de chance de rendição.
 * - Rendição bem-sucedida captura prisioneiro para a cela (capacidade 4).
 * - Interrogatório no momento da captura tem 50% de chance de revelar quadrante inimigo.
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
    }
  }

  if (isEnemyType(target.type)) {
    if (state.brig.count >= state.brig.capacity) {
      return { success: false, status: 'full_brig' }
    }

    if (rng() < HAIL_SURRENDER_CHANCE) {
      removeEnemyFromSector(state, target.id)
      state.brig.count = Math.min(state.brig.capacity, state.brig.count + 1)
      state.klingonsCaptured++

      let intelRevealed = false
      if (rng() < INTERROGATION_CHANCE) {
        intelRevealed = revealUnexploredEnemyQuadrant(state, rng)
      }

      return { success: true, status: 'surrender', intelRevealed }
    }

    return { success: false, status: 'rejected' }
  }

  return { success: false, status: 'not_found' }
}

/** Remove inimigo do setor, atualizando contagem e limpando alvos de tubos. */
function removeEnemyFromSector(state: GameState, enemyId: string): void {
  state.currentSector = state.currentSector.filter((e) => e.id !== enemyId)
  state.enemiesLeft = Math.max(0, state.enemiesLeft - 1)
  state.klingonsDestroyed++
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
