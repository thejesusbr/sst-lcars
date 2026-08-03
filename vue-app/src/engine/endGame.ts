/**
 * Fim de Jogo (endGame): verificação de condições terminais na prioridade
 * Kobayashi Maru (seção 5.3 + spec end-game) e cálculo do rating do Comandante.
 *
 * TS puro, sem Vue/Pinia.
 */

import type { EndGameReason, EndGameResult, GameState } from '@/types/game'
import {
  CAPTURED_RATING_WEIGHT,
  CAPTURED_RATING_WEIGHT_DEFAULT,
  DESTROYED_RATING_WEIGHT,
} from '@/engine/constants'

/**
 * Verifica condições terminais de acordo com a ordem estrita Kobayashi Maru:
 * 1. Explosão do Warp Core
 * 2. Destruição da nave junto com base atracada
 * 3. Casco destruído (integridade estrutural em 0)
 * 4. Morte por radiação (breach expirado sem contenção)
 * 5. Asfixia da tripulação (Life Support crítico por 5 turnos)
 * 6. Todas as bases destruídas
 * 7. Limite de stardate atingido
 * 8. Vitória (nenhum inimigo restante)
 *
 * NÃO há condição de fim de energia — ver comentário no corpo da função.
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

  // 3. Hull destroyed — dano externo que passou dos escudos acabou com a nave.
  if (state.hullIntegrity <= 0) {
    return 'hull_destroyed'
  }

  // 4. Radiation Death
  // `containment < 100`, não `=== 0`: a spec diz que zerar o relógio SEM
  // contenção COMPLETA mata. Com `=== 0`, um breach em 50% de contenção
  // sobrevivia ao próprio relógio pra sempre — contenção parcial valia como
  // contenção total.
  if (
    state.breach.active &&
    state.breach.turnsRemaining <= 0 &&
    state.breach.containment < 100
  ) {
    return 'radiation_death'
  }

  // 5. Crew Asphyxiation
  if (
    state.lifeSupportTurnsRemaining !== null &&
    state.lifeSupportTurnsRemaining <= 0 &&
    state.subsystems.life < 40
  ) {
    return 'crew_asphyxiation'
  }

  // `out_of_energy` NÃO existe nesta versão, por design.
  //
  // O original de 1978 tinha energia como estoque que drenava (`E=E-N-10`) e
  // zerar era derrota. Aqui o modelo é **vazão**: o Warp Core gera uma potência
  // e os subsistemas querem consumir. Consumir mais do que ele gera não esvazia
  // tanque nenhum — gera SOBRECARGA, que danifica o core e pode virar breach.
  // Sobrecarga e breach são o que substitui o fim de energia, e é o que dá
  // sentido à mecânica de desligar subsistema pra caber no orçamento.

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
 * - Capturados: 15 pts cada, peso POR ESPÉCIE (`CAPTURED_RATING_WEIGHT`,
 *   `round-6-polish`) — Klingon 1.75×, resto 1.5×
 * - Bônus de tempo restante: (stardateLimit - currentStardate) * 2
 * - Bases perdidas: -100 pts cada
 * - Torpedos consumidos: -1 pt cada
 */
export function calculateCommanderRating(state: GameState): number {
  // Pelos CONSTANTES, nao 10/15 cravados: os dois existiam e ninguem os lia,
  // entao mexer neles nao mudava nada (`reachability.test.ts` pegou).
  const destroyedScore = state.klingonsDestroyed * 10 * DESTROYED_RATING_WEIGHT
  const capturedScore = Math.floor(
    Object.entries(state.capturedByType).reduce(
      (sum, [type, count]) =>
        sum + (count ?? 0) * 10 * (CAPTURED_RATING_WEIGHT[type] ?? CAPTURED_RATING_WEIGHT_DEFAULT),
      0,
    ),
  )
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
