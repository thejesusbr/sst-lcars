import { describe, expect, it } from 'vitest'
import { pickHailRefusal } from '@/engine/hailRefusals'

describe('engine/hailRefusals', () => {
  it('refusals vary across attempts', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      seen.add(pickHailRefusal('klingon_cruiser', () => i / 20))
    }
    // Uma linha fixa vira ruído em playthrough longo — o requisito é variação.
    expect(seen.size).toBeGreaterThan(1)
  })

  it('every enemy type has its own table', () => {
    const types: Parameters<typeof pickHailRefusal>[0][] = [
      'klingon_cruiser',
      'klingon_d7',
      'romulan_warbird',
      'romulan_scout',
      'cloaked_raider',
    ]
    for (const type of types) {
      expect(pickHailRefusal(type, () => 0)).toBeTruthy()
    }
  })
})
