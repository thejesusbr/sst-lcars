import { describe, expect, it } from 'vitest'
import {
  autoOverload,
  breachChance,
  effectiveOverload,
  resolveWarpCoreTurn,
  startBreach,
  subsystemDraw,
} from '@/engine/warpCore'
import { createNewGameState } from '@/engine/newGame'
import {
  LIFE_SUPPORT_DRAW,
  OVERLOAD_MAX,
  WARP_CORE_DAMAGE_TABLE,
  WARP_CORE_HOUSE_DRAW,
  WARP_CORE_OUTPUT,
  effectiveWarpCoreOutput,
  warpCoreOutput,
} from '@/engine/constants'

describe('engine/warpCore', () => {
  it('subsystemDraw sums active subsystem energy draws correctly', () => {
    const state = createNewGameState(1)
    const draw = subsystemDraw(state, {})
    expect(draw).toBeGreaterThan(0)
  })

  it('autoOverload é linear no excesso absoluto, não percentual do output', () => {
    // 500 de excesso -> ceil(500/150) = 4, independente do output.
    expect(autoOverload(5000, WARP_CORE_OUTPUT)).toBe(4)
    // Mesmo excesso, output MUITO menor: o percentual daria 111, o absoluto dá 4.
    // É isto que impede o denominador encolhido de disparar a tabela Fibonacci.
    expect(autoOverload(950, 450)).toBe(4)
  })

  it('autoOverload é 0 dentro do orçamento e satura em 20', () => {
    expect(autoOverload(4000, WARP_CORE_OUTPUT)).toBe(0)
    expect(autoOverload(WARP_CORE_OUTPUT, WARP_CORE_OUTPUT)).toBe(0)
    // Mínimo 1 assim que estoura, mesmo por 1 unidade.
    expect(autoOverload(WARP_CORE_OUTPUT + 1, WARP_CORE_OUTPUT)).toBe(1)
    expect(autoOverload(20000, WARP_CORE_OUTPUT)).toBe(OVERLOAD_MAX)
    // Core morto não gera nada: satura direto.
    expect(autoOverload(100, 0)).toBe(OVERLOAD_MAX)
  })

  it('a degradação é GRADIENTE, não penhasco', () => {
    // Esta é a regressão que importa. Com a fórmula percentual antiga, integridade
    // 42 dava 0.02 de dano/turno e integridade 35 dava 85 — 7 pontos de
    // integridade atravessavam a tabela inteira, e o core a 30% morria em 1 turno.
    const draw = 1915 // consumo de cruzeiro
    const damageAt = (integrity: number) => {
      const ov = autoOverload(draw, warpCoreOutput(integrity))
      return WARP_CORE_DAMAGE_TABLE[ov]
    }

    // Nenhum degrau de 5 pontos de integridade pode multiplicar o dano por mais
    // de 10x — é o que caracteriza penhasco.
    for (const integrity of [40, 35, 30, 25, 20, 15]) {
      const here = damageAt(integrity)
      const next = damageAt(integrity - 5)
      if (here > 0) {
        expect(next / here, `degrau ${integrity} -> ${integrity - 5}`).toBeLessThan(10)
      }
    }

    // E a nave sobrevive tempo suficiente pra reagir com o core a 20%.
    expect(damageAt(20)).toBeLessThan(2)
  })

  it('cortar consumo zera a sobrecarga em qualquer integridade', () => {
    // A saída tática: com tudo desligado o consumo cai pro piso (Life Support 150
    // + house load 50 = 200) e o core para de apanhar, mesmo em frangalhos.
    const emergencyDraw = LIFE_SUPPORT_DRAW + WARP_CORE_HOUSE_DRAW
    for (const integrity of [40, 30, 20, 10]) {
      expect(
        autoOverload(emergencyDraw, warpCoreOutput(integrity)),
        `integridade ${integrity}`,
      ).toBe(0)
    }
  })

  it('sobrecarga deliberada segue perigosa com o core intacto', () => {
    // O gradiente não pode ter tornado o excesso inofensivo: disparar phaser a
    // 3000 com escudo no teto e movendo sob impulso ainda satura.
    expect(autoOverload(6500, WARP_CORE_OUTPUT)).toBeGreaterThanOrEqual(13)
    expect(autoOverload(7900, WARP_CORE_OUTPUT)).toBe(OVERLOAD_MAX)
  })

  it('effectiveOverload combines overload sources and clamps to 0-20', () => {
    const total = effectiveOverload(10, 5, 2)
    expect(total).toBe(17)

    const clamped = effectiveOverload(15, 10, 5)
    expect(clamped).toBe(20)
  })

  it('breachChance calculates chance proportional to warpCore damage fraction', () => {
    const chance = breachChance(0) // 100% damaged -> fraction 1.0 * 0.05 = 0.05
    expect(chance).toBe(0.05)
  })

  it('resolveWarpCoreTurn computes damage and rolls explosion/breach correctly', () => {
    const res = resolveWarpCoreTurn(
      {
        manualOverload: 5,
        autoOverload: 0,
        warpCoreIntegrity: 50,
      },
      () => 0.000001
    )
    expect(res.damage).toBeGreaterThan(0)
    expect(res.exploded).toBe(true)
  })

  it('effectiveWarpCoreOutput sobe com o dial de overload manual', () => {
    // 20 (teto do dial, mesma escala do preset "20%") -> +20% sobre o nominal.
    expect(effectiveWarpCoreOutput(100, 20)).toBeCloseTo(WARP_CORE_OUTPUT * 1.2, 5)
    // Sem overload manual, é o mesmo output de sempre — sem regressão no caso comum.
    expect(effectiveWarpCoreOutput(100, 0)).toBe(warpCoreOutput(100))
    // O boost combina com o dano: core a 50% ainda ganha o mesmo +20% relativo.
    expect(effectiveWarpCoreOutput(50, 20)).toBeCloseTo(warpCoreOutput(50) * 1.2, 5)
  })

  it('overload manual reduz a sobrecarga AUTOMÁTICA pro mesmo consumo — é o troca', () => {
    const draw = WARP_CORE_OUTPUT + 300 // excesso de 300 sobre o nominal
    const semOverload = autoOverload(draw, effectiveWarpCoreOutput(100, 0))
    const comOverload = autoOverload(draw, effectiveWarpCoreOutput(100, 20))
    expect(comOverload).toBeLessThan(semOverload)
  })

  it('startBreach creates an active radiation breach with 5 turns remaining', () => {
    const breach = startBreach()
    expect(breach.active).toBe(true)
    expect(breach.turnsRemaining).toBe(5)
    expect(breach.containment).toBe(0)
  })
})
