import { describe, expect, it } from 'vitest'
import {
  checkWeaponsLock,
  firePhasers,
  fireTorpedoes,
  getVisibleEnemies,
  hailTarget,
  tickCloakStress,
} from '@/engine/combat'
import { createNewGameState } from '@/engine/newGame'
import { SectorEntityType } from '@/types/game'

describe('engine/combat', () => {
  it('identifies visible enemies correctly and excludes cloaked raiders', () => {
    const state = createNewGameState(1)
    state.currentSector = [
      { id: '1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 200 },
      { id: '2', type: SectorEntityType.CLOAKED_RAIDER, position: { row: 2, col: 2 }, cloaked: true, cloakStress: 0 },
    ]
    const visible = getVisibleEnemies(state)
    expect(visible.length).toBe(1)
    expect(visible[0].id).toBe('1')
  })

  it('firePhasers splits power across locked visible enemies and damages them', () => {
    const state = createNewGameState(1)
    state.currentSector = [
      { id: '1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 100 },
      { id: '2', type: SectorEntityType.ROMULAN_WARBIRD, position: { row: 2, col: 2 }, enemyPower: 100 },
    ]
    state.weaponsLocked = true
    const res = firePhasers(state, 1000, () => 0.5)
    expect(res.success).toBe(true)
    expect(res.hits.length).toBe(2)
    expect(state.mainEnergy).toBe(2000)
    expect(state.phaserTemp).toBeGreaterThan(50)
  })

  it('fireTorpedoes fires loaded tubes and can destroy targets', () => {
    const state = createNewGameState(1)
    state.currentSector = [
      { id: '1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 150 },
    ]
    state.tubes[0].loaded = true
    state.tubes[0].targetId = '1'
    const res = fireTorpedoes(state, () => 0.5)
    expect(res.success).toBe(true)
    expect(res.shotsFired).toBe(1)
    expect(state.currentSector.length).toBe(0)
  })

  it('hailTarget can surrender an enemy and capture a prisoner', () => {
    const state = createNewGameState(1)
    state.currentSector = [
      { id: 'k1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 200 },
    ]
    const res = hailTarget(state, 'k1', () => 0.1)
    expect(res.success).toBe(true)
    expect(res.status).toBe('surrender')
    expect(state.brig.count).toBe(1)
    expect(state.currentSector.length).toBe(0)
  })

  it('tickCloakStress accumulates stress and forces decloak at cap', () => {
    const state = createNewGameState(1)
    state.currentSector = [
      { id: 'r1', type: SectorEntityType.CLOAKED_RAIDER, position: { row: 2, col: 2 }, cloaked: true, cloakStress: 18 },
    ]
    tickCloakStress(state)
    const raider = state.currentSector[0]
    expect(raider.cloaked).toBe(false)
    expect(raider.cloakStress).toBe(0)
    expect(raider.cloakCooldown).toBe(8)
  })

  it('checkWeaponsLock auto-locks when entering sector with visible enemies', () => {
    const state = createNewGameState(1)
    state.currentSector = [
      { id: 'e1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 200 },
    ]
    checkWeaponsLock(state)
    expect(state.weaponsLocked).toBe(true)
  })
})
