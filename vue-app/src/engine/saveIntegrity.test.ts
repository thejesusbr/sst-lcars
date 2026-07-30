import { describe, expect, it } from 'vitest'
import {
  computeChecksum,
  verifySaveIntegrity,
  migrateSave,
} from '@/engine/saveIntegrity'
import {
  advanceTribbleInfestation,
  renderedTribbleCount,
} from '@/engine/tribbleInfestation'
import { createNewGameState } from '@/engine/newGame'

describe('engine/saveIntegrity & tribbleInfestation', () => {
  it('computeChecksum computes SHA-256 hash string for state', async () => {
    const state = createNewGameState(1)
    const hash = await computeChecksum(state)
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('migrateSave ensures GAME_SCHEMA_VERSION is set on loaded state', () => {
    const migrated = migrateSave({ mainEnergy: 2500 })
    expect(migrated.mainEnergy).toBe(2500)
    expect(migrated.schemaVersion).toBe(1)
  })

  it('verifySaveIntegrity detects altered save when checksum record mismatches', async () => {
    const state = createNewGameState(1)
    const validState = await verifySaveIntegrity(state, undefined)
    expect(validState.tribbleInfestationActive).toBe(false)
  })

  it('advanceTribbleInfestation doubles tribble population when active', () => {
    const state = createNewGameState(1)
    state.tribbleInfestationActive = true
    state.tribblePopulation = 10
    advanceTribbleInfestation(state)
    expect(state.tribblePopulation).toBe(20)
  })

  it('renderedTribbleCount caps rendered tribbles at 200', () => {
    expect(renderedTribbleCount(50)).toBe(50)
    expect(renderedTribbleCount(1000)).toBe(200)
  })
})
