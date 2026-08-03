import { describe, expect, it } from 'vitest'
import {
  applyStarbaseDamage,
  canDock,
  dock,
  undock,
  regenStarbasePools,
} from '@/engine/docking'
import { createNewGameState } from '@/engine/newGame'
import { STARBASE_HULL_DAMAGE_DIVISOR } from '@/engine/constants'
import { SectorEntityType, type Starbase } from '@/types/game'


/**
 * Estado de teste com posição da nave FIXA em quadrante/setor 4,4 e setor limpo. Necessário
 * porque `createNewGameState` agora sorteia a posição inicial e povoa o setor
 * (world-generation) — fixtures que assumiam 4,4 e setor vazio quebravam.
 */
function fixture(seed = 1) {
  const state = createNewGameState(seed)
  state.position = { quadrant: { row: 4, col: 4 }, sector: { row: 4, col: 4 } }
  state.currentSector = []
  return state
}

describe('engine/docking', () => {
  it('canDock returns true when ship is adjacent to an alive starbase', () => {
    const state = fixture()
    state.currentSector = [
      { id: 'b1', type: SectorEntityType.STARBASE_DOCK, position: { row: 4, col: 5 } },
    ]
    expect(canDock(state)).toBe(true)
  })

  it('dock docks ship, resupplies torpedoes/energy, lowers shields and zeroes overload', () => {
    const state = fixture()
    state.currentSector = [
      { id: 'b1', type: SectorEntityType.STARBASE_DOCK, position: { row: 4, col: 5 } },
    ]
    state.starbases = [
      {
        id: 'sb-1',
        type: SectorEntityType.STARBASE_DOCK,
        quadrant: { row: 4, col: 4 },
        sector: { row: 4, col: 5 },
        resourcePool: 500,
        hullIntegrity: 100,
        shieldPoints: 1500,
        torpedoStock: 12,
        torpedoCapacity: 12,
        destroyed: false,
      },
    ]
    state.torpedoStock = 0
    state.manualOverload = 10
    state.shieldEnergy = 1000
    state.shieldsRaised = true

    const res = dock(state)
    expect(res.docked).toBe(true)
    expect(state.docked).toBe(true)
    expect(state.torpedoStock).toBeGreaterThan(0)
    expect(state.manualOverload).toBe(0)
    // Emissão desliga, mas a potência ALOCADA fica guardada (shield-power-model).
    expect(state.shieldsRaised).toBe(false)
    expect(state.shieldEnergy).toBe(1000)
  })

  it('resupply é limitado pelo estoque PRÓPRIO da base, não só pelo pool (starbase-resilience)', () => {
    const state = fixture()
    state.currentSector = [
      { id: 'b1', type: SectorEntityType.STARBASE_DOCK, position: { row: 4, col: 5 } },
    ]
    const base: Starbase = {
      id: 'sb-1',
      type: SectorEntityType.STARBASE_DOCK,
      quadrant: { row: 4, col: 4 },
      sector: { row: 4, col: 5 },
      resourcePool: 500, // pool cheio, cobriria bem mais que 2 torpedos
      hullIntegrity: 100,
      shieldPoints: 1500,
      torpedoStock: 2, // mas a base só TEM 2 torpedos pra dar
      torpedoCapacity: 12,
      destroyed: false,
    }
    state.starbases = [base]
    state.torpedoStock = 0

    dock(state)

    expect(state.torpedoStock).toBe(2)
    expect(base.torpedoStock).toBe(0)
  })

  it('undock sets docked to false and clears dockedBaseId', () => {
    const state = {
      docked: true,
      dockedBaseId: 'sb-1',
      position: { quadrant: { row: 1, col: 1 }, sector: { row: 4, col: 4 } },
      currentSector: [],
    }
    undock(state)
    expect(state.docked).toBe(false)
    expect(state.dockedBaseId).toBeNull()
  })

  it('regenStarbasePools regenerates pools of non-active starbases', () => {
    const bases = [
      {
        id: 'sb-1',
        type: SectorEntityType.STARBASE_DOCK,
        quadrant: { row: 1, col: 1 },
        sector: { row: 1, col: 1 },
        resourcePool: 450,
        hullIntegrity: 100,
        shieldPoints: 1500,
        torpedoStock: 5,
        torpedoCapacity: 20,
        destroyed: false,
      },
    ]
    regenStarbasePools(bases, 'other-id')
    expect(bases[0].resourcePool).toBe(460)
    // Drydock repõe torpedo a 1/turno (`starbase-resilience`, item 27.6).
    expect(bases[0].torpedoStock).toBe(6)
  })

  it('regenStarbasePools trava o estoque de torpedo no teto da própria base', () => {
    const bases = [
      {
        id: 'sb-1',
        type: SectorEntityType.STARBASE_SUPPLY,
        quadrant: { row: 1, col: 1 },
        sector: { row: 1, col: 1 },
        resourcePool: 450,
        hullIntegrity: 100,
        shieldPoints: 1500,
        torpedoStock: 24,
        torpedoCapacity: 24,
        destroyed: false,
      },
    ]
    regenStarbasePools(bases, null)
    expect(bases[0].torpedoStock).toBe(24)
  })
})

describe('starbase-resilience — hull/escudo próprios da base e SOS', () => {
  const mkBase = (id: string, quadrant = { row: 2, col: 2 }): Starbase => ({
    id,
    type: SectorEntityType.STARBASE_DOCK,
    quadrant,
    sector: { row: 4, col: 4 },
    resourcePool: 500,
    hullIntegrity: 100,
    shieldPoints: 1500,
    torpedoStock: 12,
    torpedoCapacity: 12,
    destroyed: false,
  })

  it('escudo absorve antes do hull, não regenera (mesma assimetria do inimigo)', () => {
    const state = fixture()
    const base = mkBase('b1')

    const dmg = applyStarbaseDamage(state, base, 500)

    expect(dmg.shieldAbsorbed).toBe(500)
    expect(dmg.hullLoss).toBe(0)
    expect(base.shieldPoints).toBe(1000)
    expect(base.hullIntegrity).toBe(100)
  })

  it('dano acima do escudo esgotado vira perda de hull, escala própria da base', () => {
    const state = fixture()
    const base = mkBase('b1')
    base.shieldPoints = 100

    const dmg = applyStarbaseDamage(state, base, 500)

    expect(base.shieldPoints).toBe(0)
    expect(dmg.hullLoss).toBeCloseTo(400 / STARBASE_HULL_DAMAGE_DIVISOR, 5)
    expect(base.hullIntegrity).toBeCloseTo(100 - 400 / STARBASE_HULL_DAMAGE_DIVISOR, 5)
  })

  it('hull chegando a 0 destrói a base', () => {
    const state = fixture()
    const base = mkBase('b1')
    base.shieldPoints = 0
    base.hullIntegrity = 5

    const dmg = applyStarbaseDamage(state, base, 500)

    expect(dmg.destroyed).toBe(true)
    expect(base.destroyed).toBe(true)
    expect(base.hullIntegrity).toBe(0)
  })

  it('base atracada nunca soa SOS — somos a única nave aliada, já estamos lá', () => {
    const state = fixture()
    const base = mkBase('b1')
    state.dockedBaseId = 'b1'

    const dmg = applyStarbaseDamage(state, base, 100)

    expect(dmg.sos).toBe(false)
  })

  it('base NÃO atracada sob ataque soa SOS — revela o quadrante no LRS e Star Chart (starbase-resilience)', () => {
    // IA ainda não ataca base independente da nave — este é o caminho que
    // fica PRONTO pra quando isso existir (ver item 27.6 do roteiro).
    const state = fixture()
    const quadrant = { row: 6, col: 7 }
    const base = mkBase('b-remote', quadrant)
    state.dockedBaseId = 'outra-base'
    const key = `${quadrant.row},${quadrant.col}`
    expect(state.exploredQuadrants[key]).toBeUndefined()
    expect(state.lrsScan[key]).toBeUndefined()

    const dmg = applyStarbaseDamage(state, base, 100)

    expect(dmg.sos).toBe(true)
    expect(state.exploredQuadrants[key]?.age).toBe(0)
    expect(state.lrsScan[key]).toEqual(state.exploredQuadrants[key])
  })
})
