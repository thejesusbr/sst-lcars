import { describe, expect, it } from 'vitest'
import type { QuadrantMap, Starbase } from '@/types/game'
import { createNewGameState } from '@/engine/newGame'
import { WARP_STRESS_PER_POINT } from '@/engine/constants'
import {
  resolveProbeScan,
  autoNavAvailable,
  autoNavDraw,
  boostCooldownTurns,
  canEngageBoost,
  chebyshev,
  clampImpulsePower,
  clampWarpFactor,
  directPath,
  effectiveImpulseMax,
  effectiveMaxWarpFactor,
  endBoost,
  findRoute,
  hostileRisk,
  inGrid,
  lrsDisabled,
  lrsNeighborhood,
  manualMove,
  markExplored,
  nearestKnownStarbase,
  planWarpTrip,
  probeTurns,
  propulsionBlocked,
  rollProbeDestroyed,
  rollRouteDegraded,
  rollStall,
  scanConfidence,
  tickBoost,
  undockSector,
  warpStress,
  warpTravelTurns,
} from '@/engine/navigation'

/** RNG determinístico: devolve os valores na ordem dada. */
const rngOf = (...values: number[]) => {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

const noObstacles = () => false
const occupiedAt = (...cells: Array<[number, number]>) => {
  const set = new Set(cells.map(([r, c]) => `${r},${c}`))
  return (c: { row: number; col: number }) => set.has(`${c.row},${c.col}`)
}

describe('distância', () => {
  it('usa o maior delta, não a soma (3 e 2 → 3)', () => {
    expect(chebyshev({ row: 1, col: 1 }, { row: 4, col: 3 })).toBe(3)
  })

  it('é 0 pra própria célula e simétrica', () => {
    const a = { row: 5, col: 2 }
    const b = { row: 2, col: 8 }
    expect(chebyshev(a, a)).toBe(0)
    expect(chebyshev(a, b)).toBe(chebyshev(b, a))
  })

  it('inGrid rejeita fora de 1-8', () => {
    expect(inGrid({ row: 1, col: 8 })).toBe(true)
    expect(inGrid({ row: 0, col: 4 })).toBe(false)
    expect(inGrid({ row: 4, col: 9 })).toBe(false)
  })
})

describe('duração e estresse de warp', () => {
  it('warp 4 leva metade dos turnos de warp 2', () => {
    const distance = 8
    expect(warpTravelTurns(distance, 2)).toBe(4)
    expect(warpTravelTurns(distance, 4)).toBe(2)
  })

  it('arredonda pra cima', () => {
    expect(warpTravelTurns(7, 2)).toBe(4)
  })

  it('warp 4 ou menos não estressa o Warp Core', () => {
    expect(warpStress(1)).toBe(0)
    expect(warpStress(4)).toBe(0)
  })

  it('soma WARP_STRESS_PER_POINT por ponto acima do fator seguro', () => {
    // Era 2 por ponto, o que dava 1% de dano em CINCO travessias completas em
    // warp 8 — custo invisível (4ª rodada, item 5.7).
    expect(warpStress(6)).toBe(2 * WARP_STRESS_PER_POINT)
    expect(warpStress(8)).toBe(4 * WARP_STRESS_PER_POINT)
  })
})

describe('dano nos Warp Engines', () => {
  it('integridade 70 baixa o teto de warp pra 5', () => {
    expect(effectiveMaxWarpFactor(70)).toBe(5)
    expect(clampWarpFactor(8, 70)).toBe(5)
    expect(clampWarpFactor(3, 70)).toBe(3)
  })

  it('teto do impulso escala com (1 - d)', () => {
    expect(effectiveImpulseMax(100)).toBe(2000)
    expect(effectiveImpulseMax(70)).toBeCloseTo(1400)
    expect(clampImpulsePower(100, 70)).toBeCloseTo(70)
  })

  it('teto do fator de warp escala com (1 - d)', () => {
    // `floor(8 * (1 - d))`: integridade 45 -> d 0.55 -> floor(3.6) = 3.
    // O "piso 1" da spec é defensivo: pra integridade não-crítica (>= 41) a
    // fórmula nunca desce abaixo de 3, então o piso só existiria se as bandas
    // mudassem.
    expect(effectiveMaxWarpFactor(45)).toBe(3)
    expect(effectiveMaxWarpFactor(100)).toBe(8)
    expect(effectiveMaxWarpFactor(70)).toBe(5)
  })

  it('integridade 55 dá 15% de chance de estagnar', () => {
    expect(rollStall(55, rngOf(0.14))).toBe(true)
    expect(rollStall(55, rngOf(0.15))).toBe(false)
  })

  it('sem chance de estagnar antes do moderado', () => {
    expect(rollStall(70, rngOf(0))).toBe(false)
  })

  it('crítico (< 40) paralisa a propulsão', () => {
    expect(propulsionBlocked(39)).toBe(true)
    expect(propulsionBlocked(40)).toBe(false)
    expect(effectiveMaxWarpFactor(39)).toBe(0)
  })
})

describe('navegação manual', () => {
  it('anda em diagonal enquanto os dois eixos diferem', () => {
    expect(directPath({ row: 1, col: 1 }, { row: 3, col: 2 })).toEqual([
      { row: 2, col: 2 },
      { row: 3, col: 2 },
    ])
  })

  it('para na última célula livre antes do obstáculo', () => {
    const move = manualMove(
      { row: 1, col: 1 },
      { row: 5, col: 5 },
      occupiedAt([4, 4]),
    )
    expect(move.position).toEqual({ row: 3, col: 3 })
    expect(move.interrupted).toBe(true)
    expect(move.rejected).toBe(false)
  })

  it('chega ao destino quando o caminho está livre', () => {
    const move = manualMove({ row: 1, col: 1 }, { row: 5, col: 5 }, noObstacles)
    expect(move.position).toEqual({ row: 5, col: 5 })
    expect(move.interrupted).toBe(false)
  })

  it('destino fora do grid é rejeitado sem mover', () => {
    const from = { row: 4, col: 4 }
    const move = manualMove(from, { row: 9, col: 4 }, noObstacles)
    expect(move).toEqual({ position: from, rejected: true, interrupted: false })
  })
})

describe('Auto-Nav Computer', () => {
  it('rota contorna o obstáculo e chega ao destino exato', () => {
    const route = findRoute(
      { row: 1, col: 1 },
      { row: 5, col: 5 },
      occupiedAt([4, 4]),
    )
    expect(route).not.toBeNull()
    expect(route!.at(-1)).toEqual({ row: 5, col: 5 })
    expect(route!.some((c) => c.row === 4 && c.col === 4)).toBe(false)
    // Sem obstáculo a rota teria 4 passos (Chebyshev de (1,1) a (5,5)). Mas
    // cobrir +4 linhas e +4 colunas em 4 passos exige que TODO passo seja
    // row+1 E col+1 -- ou seja, a diagonal estrita, que passa exatamente em
    // (4,4). Com (4,4) bloqueado, 4 passos é impossível e o ótimo é 5.
    expect(route!.length).toBe(5)
  })

  it('rota mais longa quando o desvio custa passos', () => {
    // Parede vertical completa na coluna 2, com um furo na linha 8.
    const wall = occupiedAt([1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2])
    const route = findRoute({ row: 1, col: 1 }, { row: 1, col: 3 }, wall)
    expect(route).not.toBeNull()
    expect(route!.length).toBeGreaterThan(chebyshev({ row: 1, col: 1 }, { row: 1, col: 3 }))
    expect(route!.at(-1)).toEqual({ row: 1, col: 3 })
  })

  it('sem rota quando o destino está ocupado ou fora do grid', () => {
    expect(findRoute({ row: 1, col: 1 }, { row: 2, col: 2 }, occupiedAt([2, 2]))).toBeNull()
    expect(findRoute({ row: 1, col: 1 }, { row: 0, col: 1 }, noObstacles)).toBeNull()
  })

  it('draw sobe com o dano: integridade 70 → 130', () => {
    expect(autoNavDraw(100)).toBe(100)
    expect(autoNavDraw(70)).toBeCloseTo(130)
  })

  it('integridade 55 dá 15% de chance de degradar a rota', () => {
    expect(rollRouteDegraded(55, rngOf(0.149))).toBe(true)
    expect(rollRouteDegraded(55, rngOf(0.15))).toBe(false)
  })

  it('crítico impede engajar', () => {
    expect(autoNavAvailable(40)).toBe(true)
    expect(autoNavAvailable(39)).toBe(false)
  })
})

describe('planWarpTrip', () => {
  const base = {
    from: { row: 1, col: 1 },
    to: { row: 5, col: 5 },
    warpFactor: 2,
    isOccupied: occupiedAt([4, 4]),
    warpIntegrity: 100,
    autoNavIntegrity: 100,
  }

  it('manual: rota vazia e distância direta', () => {
    const plan = planWarpTrip({ ...base, autoNav: false })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.trip.route).toEqual([])
    expect(plan.trip.autoNav).toBe(false)
    expect(plan.trip.turnsRemaining).toBe(2) // ceil(4 / 2)
  })

  it('auto-nav: guarda a rota e usa o comprimento dela', () => {
    const plan = planWarpTrip({ ...base, autoNav: true })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.trip.autoNav).toBe(true)
    expect(plan.trip.route.at(-1)).toEqual({ row: 5, col: 5 })
  })

  it('auto-nav crítico cai pro manual', () => {
    const plan = planWarpTrip({ ...base, autoNav: true, autoNavIntegrity: 30 })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.trip.autoNav).toBe(false)
    expect(plan.trip.route).toEqual([])
  })

  it('clampa o fator de warp no teto do dano', () => {
    const plan = planWarpTrip({
      ...base,
      autoNav: false,
      warpFactor: 8,
      warpIntegrity: 70,
    })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    expect(plan.trip.warpFactor).toBe(5)
  })

  it('rejeita fora do grid e com motores críticos', () => {
    expect(planWarpTrip({ ...base, autoNav: false, to: { row: 9, col: 1 } })).toEqual({
      ok: false,
      reason: 'out_of_grid',
    })
    expect(planWarpTrip({ ...base, autoNav: false, warpIntegrity: 20 })).toEqual({
      ok: false,
      reason: 'engines_critical',
    })
  })
})

describe('boost', () => {
  const idle = { active: false, turnsUsed: 0, cooldown: 0 }

  it('não desconta duração em turno sem movimento', () => {
    const boost = { active: true, turnsUsed: 2, cooldown: 0 }
    expect(tickBoost(boost, false)).toEqual(boost)
  })

  it('desconta só em turno de movimento real', () => {
    expect(tickBoost({ active: true, turnsUsed: 2, cooldown: 0 }, true).turnsUsed).toBe(3)
  })

  it('desliga sozinho no 5º turno usado e abre cooldown de 8', () => {
    const end = tickBoost({ active: true, turnsUsed: 4, cooldown: 0 }, true)
    expect(end.active).toBe(false)
    expect(end.cooldown).toBe(8) // ceil(1.5 * 5)
  })

  it('cooldown escala com os turnos usados', () => {
    expect(boostCooldownTurns(1)).toBe(2)
    expect(boostCooldownTurns(3)).toBe(5)
    expect(boostCooldownTurns(3)).toBeGreaterThan(boostCooldownTurns(1))
  })

  it('cooldown decai 1 por turno e libera o boost', () => {
    const cooling = { active: false, turnsUsed: 0, cooldown: 2 }
    expect(canEngageBoost(cooling)).toBe(false)
    const next = tickBoost(tickBoost(cooling, false), false)
    expect(next.cooldown).toBe(0)
    expect(canEngageBoost(next)).toBe(true)
  })

  it('desligar manualmente abre cooldown proporcional', () => {
    expect(endBoost({ active: true, turnsUsed: 3, cooldown: 0 })).toEqual({
      active: false,
      turnsUsed: 0,
      cooldown: 5,
    })
    expect(canEngageBoost(idle)).toBe(true)
  })
})

describe('sonda', () => {
  it('distância 3 resolve em 4 turnos; adjacente em 2', () => {
    expect(probeTurns(3)).toBe(4)
    expect(probeTurns(1)).toBe(2)
  })

  it('3 inimigos → 50% de risco, 1 inimigo → 40%', () => {
    expect(hostileRisk(1)).toBeCloseTo(0.4)
    expect(hostileRisk(3)).toBeCloseTo(0.5)
    expect(hostileRisk(0)).toBe(0)
  })

  it('setor sem inimigo nunca destrói a sonda', () => {
    expect(rollProbeDestroyed(0, rngOf(0))).toBe(false)
  })

  it('sorteio usa a chance calculada', () => {
    expect(rollProbeDestroyed(3, rngOf(0.49))).toBe(true)
    expect(rollProbeDestroyed(3, rngOf(0.51))).toBe(false)
    expect(rollProbeDestroyed(1, rngOf(0.45))).toBe(false)
  })
})

describe('LRS', () => {
  it('escopo é o 3x3 centrado no quadrante, recortado na borda', () => {
    expect(lrsNeighborhood({ row: 4, col: 4 })).toHaveLength(9)
    expect(lrsNeighborhood({ row: 1, col: 1 })).toHaveLength(4)
    expect(
      lrsNeighborhood({ row: 4, col: 4 }).every(
        (c) => chebyshev(c, { row: 4, col: 4 }) <= 1,
      ),
    ).toBe(true)
  })

  it('confiança cai 5%/turno sem dano e reseta em 100% com idade 0', () => {
    expect(scanConfidence(0)).toBe(1)
    expect(scanConfidence(2)).toBeCloseTo(0.9)
  })

  it('integridade 70 acelera pra 6.5%/turno', () => {
    expect(scanConfidence(1, 70)).toBeCloseTo(0.935)
    expect(scanConfidence(2, 70)).toBeCloseTo(0.87)
  })

  it('piso é exatamente 30% depois de 20+ turnos', () => {
    expect(scanConfidence(20)).toBe(0.3)
    expect(scanConfidence(50)).toBe(0.3)
  })

  it('crítico desliga o LRS e trava o toggle', () => {
    expect(lrsDisabled(39)).toBe(true)
    expect(lrsDisabled(40)).toBe(false)
  })
})

describe('Star Chart', () => {
  it('marca quadrante explorado com idade 0, sem mutar o mapa', () => {
    const before: QuadrantMap = {}
    const after = markExplored(before, { row: 2, col: 3 }, '104')
    expect(before).toEqual({})
    expect(after['2,3']).toEqual({ code: '104', age: 0 })
  })

  it('reveal novo reseta a confiança e atualiza o código', () => {
    const stale: QuadrantMap = { '2,3': { code: '104', age: 12 } }
    const fresh = markExplored(stale, { row: 2, col: 3 }, '003')
    expect(fresh['2,3']).toEqual({ code: '003', age: 0 })
    expect(scanConfidence(fresh['2,3'].age)).toBe(1)
    expect(scanConfidence(stale['2,3'].age)).toBeCloseTo(0.4)
  })
})

describe('destino: base mais próxima e undock', () => {
  const mkBase = (id: string, row: number, col: number): Starbase => ({
    id,
    type: 'starbase_dock',
    quadrant: { row, col },
    sector: { row: 4, col: 4 },
    resourcePool: 500,
    hullIntegrity: 100,
    shieldPoints: 1500,
    torpedoStock: 12,
    torpedoCapacity: 12,
    destroyed: false,
  })

  it('escolhe a base conhecida mais próxima', () => {
    const bases = [mkBase('far', 8, 8), mkBase('near', 5, 5)]
    const explored: QuadrantMap = {
      '8,8': { code: '000', age: 0 },
      '5,5': { code: '000', age: 0 },
    }
    expect(nearestKnownStarbase({ row: 4, col: 4 }, bases, explored)?.id).toBe('near')
  })

  it('ignora base não explorada ou destruída', () => {
    const bases = [mkBase('far', 8, 8), { ...mkBase('near', 5, 5), destroyed: true }]
    const explored: QuadrantMap = {
      '8,8': { code: '000', age: 0 },
      '5,5': { code: '000', age: 0 },
    }
    expect(nearestKnownStarbase({ row: 4, col: 4 }, bases, explored)?.id).toBe('far')
    expect(nearestKnownStarbase({ row: 4, col: 4 }, bases, {})).toBeNull()
  })

  it('undock sai pro setor a sudoeste da base', () => {
    expect(undockSector({ row: 4, col: 4 })).toEqual({ row: 5, col: 3 })
  })

  it('undock recorta no grid pra base na borda', () => {
    expect(undockSector({ row: 8, col: 1 })).toEqual({ row: 8, col: 1 })
  })
})

// ── Sonda revela planeta e dilítium (world-generation decisão 9) ─────────────

describe('resolveProbeScan', () => {
  const stateWith = (over: Partial<import('@/types/game').QuadrantContent>) => {
    const s = createNewGameState(1)
    s.galaxy['3,3'] = {
      klingons: 2,
      baseIds: ['b1'],
      stars: 5,
      planet: false,
      dilithiumCharges: 0,
      surveyed: false,
      clearedEnemies: 0,
      ...over,
    }
    return s
  }

  it('revela o KBS e grava no Star Chart', () => {
    const s = stateWith({})
    const r = resolveProbeScan(s, { row: 3, col: 3 }, false)
    expect(r.code).toBe('215')
    expect(s.exploredQuadrants['3,3']).toEqual({ code: '215', age: 0 })
  })

  it('relatório é PROSA, não o dígito KBS cru (round-6-polish)', () => {
    const s = stateWith({ klingons: 2, baseIds: ['b1'], stars: 5 })
    const r = resolveProbeScan(s, { row: 3, col: 3 }, false)
    const text = r.log.map((e) => e.text).join(' ')

    expect(text).toContain('2 naves inimigas')
    expect(text).toContain('1 base estelar')
    expect(text).toContain('5 estrelas')
    expect(text).not.toMatch(/KBS/)
  })

  it('prosa singular/zero: 1 nave, nenhuma base, 1 estrela', () => {
    const s = stateWith({ klingons: 1, baseIds: [], stars: 1 })
    const r = resolveProbeScan(s, { row: 3, col: 3 }, false)
    const text = r.log.map((e) => e.text).join(' ')

    expect(text).toContain('1 nave inimiga,')
    expect(text).toContain('0 bases estelares')
    expect(text).toContain('1 estrela.')
  })

  it('prosa desconta Cloaked Raider — bate com o dígito K vivo', () => {
    const s = stateWith({ klingons: 2, cloakedRaiders: 1 })
    const r = resolveProbeScan(s, { row: 3, col: 3 }, false)
    const text = r.log.map((e) => e.text).join(' ')

    expect(text).toContain('1 nave inimiga,')
  })

  it('revela planeta COM dilítium e reporta no log', () => {
    const s = stateWith({ planet: true, dilithiumCharges: 2 })
    const r = resolveProbeScan(s, { row: 3, col: 3 }, false)
    expect(r.planet).toBe(true)
    expect(r.dilithiumCharges).toBe(2)
    expect(r.log.map((e) => e.text).join(' ')).toMatch(/2 carga/)
    expect(s.galaxy['3,3'].surveyed).toBe(true)
  })

  it('reporta planeta ESTÉRIL, poupando uma missão à toa', () => {
    const s = stateWith({ planet: true, dilithiumCharges: 0 })
    const r = resolveProbeScan(s, { row: 3, col: 3 }, false)
    expect(r.dilithiumCharges).toBe(0)
    expect(r.log.map((e) => e.text).join(' ')).toMatch(/sem dilítium/)
    expect(s.galaxy['3,3'].surveyed).toBe(true)
  })

  it('revelar NÃO consome carga — a sonda só observa', () => {
    const s = stateWith({ planet: true, dilithiumCharges: 3 })
    resolveProbeScan(s, { row: 3, col: 3 }, false)
    expect(s.galaxy['3,3'].dilithiumCharges).toBe(3)
  })

  it('sonda destruída não revela nada e não marca explorado', () => {
    const s = stateWith({ planet: true, dilithiumCharges: 3 })
    const r = resolveProbeScan(s, { row: 3, col: 3 }, true)
    expect(r.code).toBeNull()
    expect(r.planet).toBe(false)
    expect(s.exploredQuadrants['3,3']).toBeUndefined()
    expect(s.galaxy['3,3'].surveyed).toBe(false)
  })

  it('quadrante sem planeta não reporta planeta', () => {
    const r = resolveProbeScan(stateWith({}), { row: 3, col: 3 }, false)
    expect(r.planet).toBe(false)
    expect(r.log.map((e) => e.text).join(' ')).not.toMatch(/[Pp]laneta/)
  })
})
