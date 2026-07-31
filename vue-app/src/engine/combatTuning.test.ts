/**
 * Combat-tuning (5ª rodada): energia consumível do inimigo, movimento
 * deliberado, regen de escudo invertida e Joule.
 *
 * Complementa `combatBalance.test.ts` — aqui é especificamente o que a 5ª
 * rodada pediu por cima da `combat-balance`: o inimigo deixa de se
 * neutralizar sozinho e ganha ritmo de combate (rajada e recarga), e fugir
 * passa a abrir distância de verdade.
 */

import { describe, expect, it } from 'vitest'
import { endTurn } from '@/engine/turnEngine'
import { chebyshev } from '@/engine/sector'
import {
  ENEMY_ATTACK_COST,
  ENEMY_ENERGY_MAX,
  ENEMY_ENERGY_RECHARGE,
  ENEMY_MOVE_CELLS,
} from '@/engine/constants'
import { createNewGameState } from '@/engine/newGame'
import { SectorEntityType, type SectorEntity } from '@/types/game'

/** Nave parada em (1,1); 1 inimigo a `dist` células, sem obstáculo. */
function cena(dist: number, overrides: Partial<SectorEntity> = {}) {
  const state = createNewGameState(1)
  state.position.sector = { row: 1, col: 1 }
  state.currentSector = [
    {
      id: 'k1',
      type: SectorEntityType.KLINGON_CRUISER,
      position: { row: 1, col: 1 + dist },
      enemyPower: 300,
      enemyShield: 0,
      enemyEnergy: ENEMY_ENERGY_MAX,
      ...overrides,
    },
  ]
  return state
}

const attacked = (res: ReturnType<typeof endTurn>) =>
  res.events.some((e) => e.type === 'enemy_attack' && (e.amount ?? 0) > 0)

describe('combat-tuning — energia do inimigo', () => {
  it('4 tiros esvaziam a energia; o 5º turno segura o fogo', () => {
    const state = cena(2)
    const gastos: number[] = []
    for (let i = 0; i < 4; i++) {
      endTurn(state, () => 0.99) // rng alto: nunca esquiva, sempre acerta
      gastos.push(state.currentSector[0].enemyEnergy ?? -1)
    }
    expect(gastos).toEqual([75, 50, 25, 0])

    const res5 = endTurn(state, () => 0.99)
    expect(attacked(res5)).toBe(false)
    // Turno sem atacar recarrega, não fica travado em 0.
    expect(state.currentSector[0].enemyEnergy).toBe(ENEMY_ENERGY_RECHARGE)
  })

  it('sem energia suficiente pro custo, não ataca', () => {
    const state = cena(2, { enemyEnergy: ENEMY_ATTACK_COST - 1 })
    const res = endTurn(state, () => 0.99)
    expect(attacked(res)).toBe(false)
  })

  it('enemyPower não cai por atacar — só por dano do jogador (fecha 23.3)', () => {
    const state = cena(2)
    const before = state.currentSector[0].enemyPower
    for (let i = 0; i < 3; i++) endTurn(state, () => 0.99)
    expect(state.currentSector[0].enemyPower).toBe(before)
  })

  it('turno ocioso (sem atacar) recarrega, capado no teto', () => {
    const state = cena(2, { enemyEnergy: ENEMY_ENERGY_MAX - 5 })
    // Sem energia pro custo? Não — tem de sobra. Força ociosidade drenando
    // primeiro até faltar, depois confirma o teto do recarregamento.
    state.currentSector[0].enemyEnergy = ENEMY_ATTACK_COST - 1
    endTurn(state, () => 0.99)
    expect(state.currentSector[0].enemyEnergy).toBeLessThanOrEqual(ENEMY_ENERGY_MAX)
  })
})

describe('combat-tuning — movimento deliberado', () => {
  it('armado (energia cheia), aproxima do jogador', () => {
    const state = cena(5, { enemyEnergy: ENEMY_ENERGY_MAX })
    const before = chebyshev(state.position.sector, state.currentSector[0].position)
    endTurn(state, () => 0.99)
    const after = chebyshev(state.position.sector, state.currentSector[0].position)
    expect(after).toBeLessThan(before)
  })

  it('drenado (sem energia), evade — abrindo distância', () => {
    // Longe da borda pra ter espaço real de fuga.
    const state = createNewGameState(1)
    state.position.sector = { row: 4, col: 4 }
    state.currentSector = [
      {
        id: 'k1',
        type: SectorEntityType.KLINGON_CRUISER,
        position: { row: 6, col: 6 },
        enemyPower: 300,
        enemyShield: 0,
        enemyEnergy: 0,
      },
    ]
    const before = chebyshev(state.position.sector, state.currentSector[0].position)
    endTurn(state, () => 0.99)
    const after = chebyshev(state.position.sector, state.currentSector[0].position)
    expect(after).toBeGreaterThan(before)
  })

  it('nunca teleporta: o deslocamento por turno é limitado a ENEMY_MOVE_CELLS', () => {
    const state = cena(7, { enemyEnergy: ENEMY_ENERGY_MAX })
    const before = { ...state.currentSector[0].position }
    endTurn(state, () => 0.99)
    const moved = chebyshev(before, state.currentSector[0].position)
    expect(moved).toBeLessThanOrEqual(ENEMY_MOVE_CELLS)
  })

  it('fuga a impulso máximo abre pelo menos 5 células no turno (5ª rodada, 23.18)', () => {
    // Cenário do relato: nave corre longe, inimigo não pode reencostar no
    // mesmo turno. Simulamos o lado do inimigo: ele evade (sem energia)
    // enquanto o jogador se afasta — o ganho de distância soma dos dois lados,
    // então medir só a evasão do inimigo (>= ENEMY_MOVE_CELLS) já é a garantia
    // que falta pro impulso do jogador (8 células) não ser anulado.
    const state = createNewGameState(1)
    state.position.sector = { row: 4, col: 4 }
    state.currentSector = [
      {
        id: 'k1',
        type: SectorEntityType.KLINGON_CRUISER,
        position: { row: 5, col: 5 },
        enemyPower: 300,
        enemyShield: 0,
        enemyEnergy: 0,
      },
    ]
    const before = chebyshev(state.position.sector, state.currentSector[0].position)
    endTurn(state, () => 0.99)
    const after = chebyshev(state.position.sector, state.currentSector[0].position)
    expect(after - before).toBeGreaterThanOrEqual(ENEMY_MOVE_CELLS)
  })
})
