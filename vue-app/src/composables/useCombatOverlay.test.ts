/**
 * `enemy-species`: overlay de combate colorido por facção — um feixe cravado
 * numa cor só ficava ilegível assim que mais de um atacante disparava no
 * mesmo turno (3ª rodada).
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCombatOverlay } from '@/composables/useCombatOverlay'
import { usePresentation } from '@/stores/usePresentation'
import { SectorEntityType } from '@/types/game'

describe('useCombatOverlay — cor de facção', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tiro do jogador (phaser/torpedo) sai azul', () => {
    const presentation = usePresentation()
    presentation.sectorSnapshot = { entities: [], ship: { row: 4, col: 4 } }
    presentation.current = {
      step: 1,
      type: 'player_phasers',
      text: '',
      at: { row: 5, col: 5 },
    }

    const overlay = useCombatOverlay()

    expect(overlay.value?.color).toBe('var(--faction-player)')
  })

  it('ataque Klingon sai vermelho', () => {
    const presentation = usePresentation()
    presentation.sectorSnapshot = {
      entities: [
        { id: 'k1', type: SectorEntityType.KLINGON_CRUISER, position: { row: 2, col: 2 } },
      ],
      ship: { row: 4, col: 4 },
    }
    presentation.current = {
      step: 3,
      type: 'enemy_attack',
      text: '',
      at: { row: 2, col: 2 },
      entityId: 'k1',
    }

    const overlay = useCombatOverlay()

    expect(overlay.value?.color).toBe('var(--faction-klingon)')
  })

  it('ataque Romulano sai verde', () => {
    const presentation = usePresentation()
    presentation.sectorSnapshot = {
      entities: [
        { id: 'r1', type: SectorEntityType.ROMULAN_SCOUT, position: { row: 2, col: 2 } },
      ],
      ship: { row: 4, col: 4 },
    }
    presentation.current = {
      step: 3,
      type: 'enemy_attack',
      text: '',
      at: { row: 2, col: 2 },
      entityId: 'r1',
    }

    const overlay = useCombatOverlay()

    expect(overlay.value?.color).toBe('var(--faction-romulan)')
  })

  it('impacto no casco herda a cor de quem disparou (raider, roxo)', () => {
    const presentation = usePresentation()
    presentation.sectorSnapshot = {
      entities: [
        { id: 'p1', type: SectorEntityType.CLOAKED_RAIDER, position: { row: 2, col: 2 } },
      ],
      ship: { row: 4, col: 4 },
    }
    presentation.current = {
      step: 3,
      type: 'hull_damage',
      text: '',
      at: { row: 4, col: 4 },
      entityId: 'p1',
    }

    const overlay = useCombatOverlay()

    expect(overlay.value?.color).toBe('var(--faction-raider)')
  })

  it('sem entidade correspondente (ex.: subsystem_hit sem entityId), sem cor — cai no currentColor do CSS', () => {
    const presentation = usePresentation()
    presentation.sectorSnapshot = { entities: [], ship: { row: 4, col: 4 } }
    presentation.current = {
      step: 3,
      type: 'subsystem_hit',
      text: '',
      at: { row: 4, col: 4 },
    }

    const overlay = useCombatOverlay()

    expect(overlay.value?.color).toBeUndefined()
  })
})
