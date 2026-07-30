/**
 * Fim de Jogo (endGame): verificação de condições terminais na prioridade
 * Kobayashi Maru (seção 5.3 + spec end-game) e cálculo do rating do Comandante.
 *
 * TS puro, sem Vue/Pinia.
 */

import type { EndGameReason, EndGameResult, GameState } from '@/types/game'

/**
 * Verifica condições terminais de acordo com a ordem estrita Kobayashi Maru:
 * 1. Explosão do Warp Core
 * 2. Destruição da nave junto com base atracada
 * 3. Morte por radiação (breach expirado sem contenção)
 * 4. Asfixia da tripulação (Life Support crítico por 5 turnos)
 * 5. Fim de energia (mainEnergy <= 0)
 * 6. Todas as bases destruídas
 * 7. Limite de stardate atingido
 * 8. Vitória (nenhum inimigo restante)
 */
export function checkTerminalConditions(
  state: GameState,
  options: {
    warpCoreExploded?: boolean
    dockedBaseDestroyed?: boolean
  } = {}
): EndGameReason | null {
  // 1. Warp Core Explosion
  if (options.warpCoreExploded || state.subsystems.warpCore <= 0) {
    return 'warp_core_explosion'
  }

  // 2. Ship destroyed with docked base
  if (options.dockedBaseDestroyed) {
    return 'destroyed_with_base'
  }

  // 3. Radiation Death
  if (
    state.breach.active &&
    state.breach.turnsRemaining <= 0 &&
    state.breach.containment === 0
  ) {
    return 'radiation_death'
  }

  // 4. Crew Asphyxiation
  if (
    state.lifeSupportTurnsRemaining !== null &&
    state.lifeSupportTurnsRemaining <= 0 &&
    state.subsystems.life < 40
  ) {
    return 'crew_asphyxiation'
  }

  // 5. Out of Energy
  if (state.mainEnergy <= 0) {
    return 'out_of_energy'
  }

  // 6. No Starbases Left
  const aliveBases = state.starbases.filter((b) => !b.destroyed).length
  if (aliveBases === 0 && state.starbases.length > 0) {
    return 'no_starbases'
  }

  // 7. Out of Time
  if (state.stardate >= state.stardateLimit) {
    return 'out_of_time'
  }

  // 8. Victory
  if (state.enemiesLeft === 0) {
    return 'victory'
  }

  return null
}

/**
 * Calcula o rating de Comandante ao fim de jogo.
 * - Klingons destruídos: 10 pts cada
 * - Klingons capturados: 15 pts cada (peso 1.5x)
 * - Bônus de tempo restante: (stardateLimit - currentStardate) * 2
 * - Bases perdidas: -100 pts cada
 * - Torpedos consumidos: -1 pt cada
 */
export function calculateCommanderRating(state: GameState): number {
  const destroyedScore = state.klingonsDestroyed * 10
  const capturedScore = Math.floor(state.klingonsCaptured * 15)
  const timeRemaining = Math.max(0, state.stardateLimit - state.stardate)
  const timeScore = Math.floor(timeRemaining * 2)
  const starbasesDestroyed = state.starbases.filter((b) => b.destroyed).length
  const starbasePenalty = starbasesDestroyed * 100
  const torpedoPenalty = state.torpedoesUsed

  return Math.round(destroyedScore + capturedScore + timeScore - starbasePenalty - torpedoPenalty)
}

/**
 * Avalia o fim de jogo no turno atual. Se houver condição terminal ativa,
 * calcula o rating, atualiza state.mode para 'result' e preenche state.result.
 */
export function evaluateEndGame(
  state: GameState,
  options: {
    warpCoreExploded?: boolean
    dockedBaseDestroyed?: boolean
  } = {}
): EndGameResult | null {
  const reason = checkTerminalConditions(state, options)
  if (!reason) {
    return null
  }

  const victory = reason === 'victory'
  const rating = calculateCommanderRating(state)
  const result: EndGameResult = {
    reason,
    victory,
    rating,
  }

  state.result = result
  state.mode = 'result'
  return result
}
