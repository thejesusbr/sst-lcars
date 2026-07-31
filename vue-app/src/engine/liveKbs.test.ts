/**
 * Código KBS vivo: o dígito K desconta as baixas do quadrante.
 *
 * O defeito original era DUPLICAÇÃO — cinco produtores do mesmo código, só a
 * materialização de setor ciente de `clearedEnemies`. Estes testes cobrem a
 * função única e o efeito dela nos produtores que a chamam.
 */

import { describe, expect, it } from 'vitest'
import { liveKbsCode } from '@/engine/constants'
import { firePhasers } from '@/engine/combat'
import { resolveProbeScan } from '@/engine/navigation'
import { createNewGameState } from '@/engine/newGame'
import { SectorEntityType } from '@/types/game'

const quadrante = (klingons: number, clearedEnemies: number) => ({
  klingons,
  clearedEnemies,
  baseIds: [] as string[],
  stars: 4,
})

describe('engine/constants — liveKbsCode', () => {
  it('desconta as baixas do dígito K', () => {
    expect(liveKbsCode(quadrante(3, 0))).toBe('304')
    expect(liveKbsCode(quadrante(3, 2))).toBe('104')
    expect(liveKbsCode(quadrante(3, 3))).toBe('004')
  })

  it('não vai a negativo se as baixas passarem do gerado', () => {
    expect(liveKbsCode(quadrante(1, 5))).toBe('004')
  })

  it('conta bases pelo tamanho de baseIds', () => {
    expect(liveKbsCode({ ...quadrante(2, 1), baseIds: ['b1', 'b2'] })).toBe('124')
  })
})

describe('KBS vivo — produtores concordam', () => {
  /** Põe a nave num quadrante com 2 Klingons e devolve chave + estado. */
  function comDoisKlingons() {
    const state = createNewGameState(1)
    const key = `${state.position.quadrant.row},${state.position.quadrant.col}`
    const q = state.galaxy![key]
    q.klingons = 2
    q.clearedEnemies = 0
    return { state, key, q }
  }

  it('destruir inimigo derruba o dígito e grava no mapa com confiança cheia', () => {
    const { state, key, q } = comDoisKlingons()
    state.currentSector = [
      {
        id: 'k1',
        type: SectorEntityType.KLINGON_CRUISER,
        position: { row: 1, col: 1 },
        enemyPower: 10,
      },
    ]
    state.weaponsLocked = true

    const antes = liveKbsCode(q)
    const res = firePhasers(state, 5000, () => 0.9)

    expect(res.hits[0].destroyed).toBe(true)
    expect(q.clearedEnemies).toBe(1)
    expect(liveKbsCode(q)).not.toBe(antes)
    // Sua ação atualiza seu mapa: nada de reescanear pra reaprender o que você
    // mesmo fez.
    expect(state.exploredQuadrants[key]).toEqual({ code: liveKbsCode(q), age: 0 })
  })

  it('a sonda reporta o código vivo, não o gerado', () => {
    const state = createNewGameState(1)
    const alvo = { row: 1, col: 1 }
    const key = `${alvo.row},${alvo.col}`
    const q = state.galaxy![key]
    q.klingons = 3
    q.clearedEnemies = 2
    // `destroyed: false` — a sonda sobreviveu e reporta.
    const res = resolveProbeScan(state, alvo, false)

    expect(res.code).toBe(liveKbsCode(q))

    expect(state.exploredQuadrants[key].code).toBe(liveKbsCode(q))
    expect(state.exploredQuadrants[key].code[0]).toBe('1')
  })
})
