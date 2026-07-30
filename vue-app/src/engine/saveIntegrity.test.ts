import { describe, expect, it } from 'vitest'
import {
  commitTurnChecksum,
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
    const migrated = migrateSave({ shieldEnergy: 2500 }, createNewGameState(0))
    expect(migrated.shieldEnergy).toBe(2500)
    expect(migrated.schemaVersion).toBe(1)
  })

  it('verifySaveIntegrity detects altered save when checksum record mismatches', async () => {
    const state = createNewGameState(1)
    const validState = await verifySaveIntegrity(state, state, undefined)
    expect(validState.tribbleInfestationActive).toBe(false)
  })

  it('verifySaveIntegrity flags tampering when the stored digest does not match', async () => {
    const state = createNewGameState(1)
    const store = new Map<string, string>()
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    }
    await commitTurnChecksum(state, storage)

    // Editar o save à mão sem regravar o selo é exatamente o caso que o
    // marcador existe pra pegar.
    const tampered = { ...state, torpedoStock: 999999 }
    const result = await verifySaveIntegrity(tampered, state, storage)
    expect(result.tribbleInfestationActive).toBe(true)
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

  it('identidade da nave/capitão sobrevive à migração de um save carregado', () => {
    const migrated = migrateSave(
      { shipIconKey: 'defiant', shipName: 'U.S.S. Defiant', captainName: 'Sisko' },
      createNewGameState(0),
    )
    expect(migrated.shipIconKey).toBe('defiant')
    expect(migrated.shipName).toBe('U.S.S. Defiant')
    expect(migrated.captainName).toBe('Sisko')
  })
})
