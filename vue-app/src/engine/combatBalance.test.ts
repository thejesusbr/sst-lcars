/**
 * Balanceamento de combate: escudo inimigo, atenuação por distância, linha de
 * tiro, esquiva, regeneração de escudo e termodinâmica do phaser.
 *
 * A 4ª rodada mediu que uma briga 1v1 resolvia no primeiro tiro. Estes testes
 * prendem o combate novo aos números do design, pra que a próxima mudança de
 * balanceamento seja deliberada em vez de silenciosa.
 */

import { describe, expect, it } from 'vitest'
import { applyHostileDamage, evasionChance, firePhasers } from '@/engine/combat'
import { chebyshev, lineBetween, obstaclesBetween } from '@/engine/sector'
import { regenShields } from '@/engine/turnEngine'
import { damageFalloff } from '@/engine/constants'
import { createNewGameState } from '@/engine/newGame'
import { SectorEntityType, type SectorEntity } from '@/types/game'

const klingon = (col: number, power = 200, shield = 150): SectorEntity => ({
  id: 'k1',
  type: SectorEntityType.KLINGON_CRUISER,
  position: { row: 1, col },
  enemyPower: power,
  enemyShield: shield,
})

/** Nave em (1,1), 1 alvo, lock feito, calor zerado. */
function duelo(distancia: number, extra: SectorEntity[] = []) {
  const state = createNewGameState(1)
  state.position.sector = { row: 1, col: 1 }
  state.currentSector = [klingon(1 + distancia), ...extra]
  state.weaponsLocked = true
  state.phaserTemp = 0
  return state
}

describe('combat-balance — escudo inimigo', () => {
  it('escudo absorve antes do poder', () => {
    const state = duelo(1)
    const alvo = state.currentSector[0]
    const { destroyed } = applyHostileDamage(state, alvo, 100)

    expect(alvo.enemyShield).toBe(50)
    expect(alvo.enemyPower).toBe(200)
    expect(destroyed).toBe(false)
  })

  it('acerto maior que o escudo transborda pro poder', () => {
    const state = duelo(1)
    const alvo = state.currentSector[0]
    applyHostileDamage(state, alvo, 200)

    expect(alvo.enemyShield).toBe(0)
    expect(alvo.enemyPower).toBe(150)
  })

  it('escudo inimigo não regenera — assimetria deliberada', () => {
    const state = duelo(1)
    const alvo = state.currentSector[0]
    applyHostileDamage(state, alvo, 100)
    const depois = alvo.enemyShield

    for (let i = 0; i < 5; i++) regenShields(state)

    expect(alvo.enemyShield).toBe(depois)
  })

  it('inimigo nasce com escudo', () => {
    const state = createNewGameState(7)
    const hostis = state.currentSector.filter((e) => e.enemyPower !== undefined)
    for (const h of hostis) expect(h.enemyShield).toBeGreaterThan(0)
  })
})

describe('combat-balance — atenuação por distância', () => {
  it('o mesmo tiro dói mais de perto', () => {
    const perto = duelo(1)
    const longe = duelo(5)
    const a = firePhasers(perto, 1500, () => 0.5).hits[0].damage
    const b = firePhasers(longe, 1500, () => 0.5).hits[0].damage

    expect(a).toBeGreaterThan(b * 2)
  })

  it('1 tiro não resolve mais uma briga', () => {
    const state = duelo(1)
    const res = firePhasers(state, 1500, () => 0.5)

    expect(res.hits[0].destroyed).toBe(false)
    expect(state.currentSector.length).toBe(1)
  })

  it('a LUT é não-crescente', () => {
    for (let d = 2; d <= 7; d++) {
      expect(damageFalloff(d)).toBeLessThanOrEqual(damageFalloff(d - 1))
    }
  })

  it('derrubar o alvo custa mais tiros de longe', () => {
    const tiros = (dist: number) => {
      const state = duelo(dist)
      let n = 0
      while (n < 40 && state.currentSector.length > 0) {
        state.phaserTemp = 0
        firePhasers(state, 1500, () => 0.5)
        n++
      }
      return n
    }
    expect(tiros(1)).toBe(2)
    expect(tiros(7)).toBeGreaterThan(tiros(1) * 3)
  })
})

describe('combat-balance — linha de tiro', () => {
  const estrela = (row: number, col: number): SectorEntity => ({
    id: `s-${row}-${col}`,
    type: SectorEntityType.STAR,
    position: { row, col },
  })

  it('lineBetween exclui as pontas', () => {
    const path = lineBetween({ row: 1, col: 1 }, { row: 1, col: 4 })
    expect(path).toEqual([
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ])
  })

  it('estrela no caminho conta como obstáculo', () => {
    const entidades = [estrela(1, 3)]
    expect(obstaclesBetween(entidades, { row: 1, col: 1 }, { row: 1, col: 5 })).toBe(1)
    expect(obstaclesBetween(entidades, { row: 4, col: 1 }, { row: 4, col: 5 })).toBe(0)
  })

  it('phaser é barrado por cobertura, sem gastar o alvo', () => {
    const state = duelo(4, [estrela(1, 3)])
    const res = firePhasers(state, 1500, () => 0.5)

    expect(res.hits[0].blocked).toBe(true)
    expect(res.hits[0].damage).toBe(0)
    expect(state.currentSector[0].enemyShield).toBe(150)
  })

  it('sem obstáculo o tiro passa', () => {
    const state = duelo(4)
    expect(firePhasers(state, 1500, () => 0.5).hits[0].blocked).toBeUndefined()
  })
})

describe('combat-balance — esquiva', () => {
  it('parado nunca esquiva', () => {
    expect(evasionChance(0)).toBe(0)
  })

  it('a chance sobe com as células cobertas', () => {
    expect(evasionChance(8)).toBeGreaterThan(evasionChance(1))
  })

  it('alvo em movimento escapa do tiro', () => {
    const state = duelo(1)
    state.currentSector[0].cellsMovedThisTurn = 8
    // rng fixo abaixo da chance de esquiva de 8 células (40%).
    const res = firePhasers(state, 1500, () => 0.1)

    expect(res.hits[0].evaded).toBe(true)
    expect(res.hits[0].damage).toBe(0)
  })
})

describe('combat-balance — regeneração de escudo', () => {
  it('o dano acumulado volta a cair', () => {
    const state = createNewGameState(1)
    state.shieldDamageTaken = 500
    state.shieldEnergy = 1500

    regenShields(state)

    expect(state.shieldDamageTaken).toBeLessThan(500)
  })

  it('mais energia mantida recupera mais rápido', () => {
    const alta = createNewGameState(1)
    alta.shieldDamageTaken = 500
    alta.shieldEnergy = 2000
    const baixa = createNewGameState(1)
    baixa.shieldDamageTaken = 500
    baixa.shieldEnergy = 500

    regenShields(alta)
    regenShields(baixa)

    expect(alta.shieldDamageTaken).toBeLessThan(baixa.shieldDamageTaken)
  })

  it('Shield Control danificado regenera menos', () => {
    const intacto = createNewGameState(1)
    intacto.shieldDamageTaken = 500
    intacto.shieldEnergy = 1500
    const avariado = createNewGameState(1)
    avariado.shieldDamageTaken = 500
    avariado.shieldEnergy = 1500
    avariado.subsystems.shields = 55

    regenShields(intacto)
    regenShields(avariado)

    expect(intacto.shieldDamageTaken).toBeLessThan(avariado.shieldDamageTaken)
  })

  it('Shield Control em crítico paralisa a regeneração', () => {
    const state = createNewGameState(1)
    state.shieldDamageTaken = 500
    state.shieldEnergy = 2500
    state.subsystems.shields = 20

    regenShields(state)

    expect(state.shieldDamageTaken).toBe(500)
  })
})

describe('combat-balance — termodinâmica do phaser', () => {
  it('potência maior esquenta mais', () => {
    const a = duelo(1)
    const b = duelo(1)
    firePhasers(a, 1500, () => 0.5)
    firePhasers(b, 3000, () => 0.5)

    expect(b.phaserTemp).toBeCloseTo(a.phaserTemp * 2, 5)
  })

  it('a potência padrão mantém o aquecimento de sempre', () => {
    const state = duelo(1)
    firePhasers(state, 1500, () => 0.5)
    expect(state.phaserTemp).toBe(30)
  })

  it('dano no subsistema continua compondo com a potência', () => {
    const state = duelo(1)
    state.subsystems.phasers = 70
    firePhasers(state, 1500, () => 0.5)
    expect(state.phaserTemp).toBeGreaterThan(30)
  })
})

describe('combat-balance — geometria', () => {
  it('chebyshev é a régua usada', () => {
    expect(chebyshev({ row: 1, col: 1 }, { row: 4, col: 3 })).toBe(3)
  })
})
