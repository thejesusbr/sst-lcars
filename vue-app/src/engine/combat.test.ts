import { describe, expect, it } from 'vitest'
import {
  checkWeaponsLock,
  firePhasers,
  fireTorpedoes,
  hailTarget,
  tickCloakStress,
} from '@/engine/combat'
import { getVisibleEnemies } from '@/engine/sector'
import { createNewGameState } from '@/engine/newGame'
import { ENEMY_TYPES, SectorEntityType, type EnemyType } from '@/types/game'
import { HAIL_SURRENDER_BAND } from '@/engine/constants'

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
    // Não há estoque de energia pra debitar: a potência comprometida vira
    // CONSUMO do turno (`subsystemDraw`), e é isso que pode estourar o
    // orçamento do Warp Core e gerar sobrecarga.
    expect(res.powerCommitted).toBe(1000)
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
    const res = hailTarget(state, 'k1', () => 0.01)
    expect(res.success).toBe(true)
    expect(res.status).toBe('surrender')
    expect(state.brig.count).toBe(1)
    expect(state.currentSector.length).toBe(0)
  })

  // ── hail-and-identity: alcance, resposta de base, rendição escalada ────────

  it('hailTarget reaches a base by id alone — no cell/distance check', () => {
    const state = createNewGameState(1)
    state.position.quadrant = { row: 4, col: 4 }
    state.currentSector = [
      { id: 'b1', type: SectorEntityType.STARBASE_DOCK, position: { row: 8, col: 8 }, enemyPower: 0 },
    ]
    state.starbases = [
      {
        id: 'b1',
        type: SectorEntityType.STARBASE_DOCK,
        quadrant: { row: 4, col: 4 },
        sector: { row: 8, col: 8 },
        resourcePool: 275,
        destroyed: false,
      },
    ]
    const res = hailTarget(state, 'b1')
    expect(res.status).toBe('base_status')
    expect(res.revealedBasePool).toBe(275)
    expect(res.revealedBaseType).toBe(SectorEntityType.STARBASE_DOCK)
    expect(res.revealedBaseQuadrant).toEqual({ row: 4, col: 4 })
  })

  it('surrender chance rises as the target takes damage, floor at intact', () => {
    const state = createNewGameState(1)
    state.currentSector = [
      { id: 'intact', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 200 },
    ]
    // Piso: 0.30. Um roll logo acima do piso falha pro alvo intacto...
    expect(hailTarget(state, 'intact', () => 0.31).status).toBe('rejected')

    state.currentSector = [
      { id: 'crippled', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 20 },
    ]
    // ...mas o MESMO roll rende o alvo em farrapos, porque a chance subiu.
    expect(hailTarget(state, 'crippled', () => 0.31).status).toBe('surrender')
  })

  // ── enemy-species: rendição por espécie ───────────────────────────────────

  it('Klingon intacto ~10%, em farrapos ~35%; raider 30%/70%', () => {
    const state = createNewGameState(1)

    state.currentSector = [
      { id: 'k1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 200 },
    ]
    expect(hailTarget(state, 'k1', () => 0.09).status).toBe('surrender')
    state.currentSector = [
      { id: 'k1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 200 },
    ]
    expect(hailTarget(state, 'k1', () => 0.11).status).toBe('rejected')

    state.currentSector = [
      { id: 'k2', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 0 },
    ]
    expect(hailTarget(state, 'k2', () => 0.34).status).toBe('surrender')
    state.currentSector = [
      { id: 'k2', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 0 },
    ]
    expect(hailTarget(state, 'k2', () => 0.36).status).toBe('rejected')

    state.currentSector = [
      { id: 'r1', type: SectorEntityType.CLOAKED_RAIDER, position: { row: 1, col: 1 }, enemyPower: 200 },
    ]
    expect(hailTarget(state, 'r1', () => 0.29).status).toBe('surrender')
    state.currentSector = [
      { id: 'r2', type: SectorEntityType.CLOAKED_RAIDER, position: { row: 1, col: 1 }, enemyPower: 0 },
    ]
    expect(hailTarget(state, 'r2', () => 0.69).status).toBe('surrender')
  })

  it('um raider em farrapos rende MUITO mais que um Klingon na mesma fração de poder', () => {
    const mesmaFracao = (type: EnemyType) => {
      const state = createNewGameState(1)
      state.currentSector = [
        { id: 'x', type, position: { row: 1, col: 1 }, enemyPower: 20 }, // 90% de dano
      ]
      // Roll fixo entre o teto do Klingon (0.35) e o do raider (0.70): só o
      // raider rende.
      return hailTarget(state, 'x', () => 0.5).status
    }
    expect(mesmaFracao(SectorEntityType.KLINGON_CRUISER)).toBe('rejected')
    expect(mesmaFracao(SectorEntityType.CLOAKED_RAIDER)).toBe('surrender')
  })

  it('todo membro de ENEMY_TYPES tem piso/teto na tabela — sem fallback', () => {
    for (const type of ENEMY_TYPES) {
      expect(HAIL_SURRENDER_BAND[type]).toBeDefined()
      const [floor, ceiling] = HAIL_SURRENDER_BAND[type]
      expect(floor).toBeGreaterThan(0)
      expect(ceiling).toBeGreaterThan(floor)
    }
  })

  it('a failed surrender roll answers back with a refusal line', () => {
    const state = createNewGameState(1)
    state.currentSector = [
      { id: 'k1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 1, col: 1 }, enemyPower: 200 },
    ]
    const res = hailTarget(state, 'k1', () => 0.99)
    expect(res.status).toBe('rejected')
    expect(res.refusalText).toBeTruthy()
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
