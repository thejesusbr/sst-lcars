import { describe, it, expect } from 'vitest'

import {
  generateWorld,
  kbsCode,
  materializeSector,
  quadrantKey,
  GRID_MAX,
} from './worldGen'
import { ENEMY_TYPES, SectorEntityType, type QuadrantContent } from '@/types/game'
import { ENEMY_BASE_POWER, ENEMY_POWER_BAND } from './constants'

const isEnemy = (t: string) => (ENEMY_TYPES as readonly string[]).includes(t)

const world = (seed: number) => generateWorld(seed)

describe('determinismo por semente', () => {
  it('mesma semente produz galáxia idêntica', () => {
    const a = world(12345)
    const b = world(12345)
    expect(a.galaxy).toEqual(b.galaxy)
    expect(a.enemyTotal).toBe(b.enemyTotal)
    expect(a.position).toEqual(b.position)
    expect(a.starbases.map((s) => [s.quadrant, s.type])).toEqual(
      b.starbases.map((s) => [s.quadrant, s.type]),
    )
  })

  it('sementes diferentes produzem galáxias diferentes', () => {
    expect(world(1).galaxy).not.toEqual(world(2).galaxy)
  })
})

describe('estrutura da galáxia', () => {
  it('gera exatamente 64 quadrantes', () => {
    expect(Object.keys(world(7).galaxy)).toHaveLength(GRID_MAX * GRID_MAX)
  })

  it('todo quadrante tem entre 1 e 8 estrelas, nunca 0', () => {
    // Garantia herdada da fonte (`FNR` nunca devolve 0) e mantida de propósito:
    // nenhuma célula da galáxia é vazia (design.md decisão 7b).
    for (let seed = 1; seed <= 20; seed++) {
      for (const q of Object.values(world(seed).galaxy)) {
        expect(q.stars).toBeGreaterThanOrEqual(1)
        expect(q.stars).toBeLessThanOrEqual(8)
      }
    }
  })
})

describe('código KBS', () => {
  it('codifica klingons/bases/estrelas em 3 dígitos', () => {
    const content: QuadrantContent = {
      klingons: 2,
      baseIds: ['base-1'],
      stars: 5,
      planet: false,
      dilithiumCharges: 0,
      surveyed: false,
      clearedEnemies: 0,
    }
    expect(kbsCode(content)).toBe('215')
  })

  it('não expõe planeta — planeta é invisível a longa distância', () => {
    const base: QuadrantContent = {
      klingons: 0,
      baseIds: [],
      stars: 3,
      planet: false,
      dilithiumCharges: 0,
      surveyed: false,
      clearedEnemies: 0,
    }
    const comPlaneta = { ...base, planet: true, dilithiumCharges: 3 }
    expect(kbsCode(comPlaneta)).toBe(kbsCode(base))
  })
})

describe('bases', () => {
  it('sempre existe pelo menos 1 STARBASE_DOCK', () => {
    // Sem base de reparo o dano fica permanente e o jogo é invencível
    // (design.md decisão 6).
    for (let seed = 1; seed <= 40; seed++) {
      const { starbases } = world(seed)
      expect(
        starbases.some((b) => b.type === SectorEntityType.STARBASE_DOCK),
      ).toBe(true)
    }
  })

  it('toda base contada existe posicionada num quadrante', () => {
    const { galaxy, starbases } = world(99)
    const referenciadas = Object.values(galaxy).flatMap((q) => q.baseIds)
    expect(referenciadas.sort()).toEqual(starbases.map((b) => b.id).sort())
  })

  it('gera pelo menos as 2 garantidas', () => {
    for (let seed = 1; seed <= 15; seed++) {
      expect(world(seed).starbases.length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('odds convergem em amostra grande', () => {
  // 40 galáxias × 64 quadrantes = 2560 amostras.
  const quadrantes = Array.from({ length: 40 }, (_, i) =>
    Object.values(world(i + 1).galaxy),
  ).flat()

  it('distribuição de Klingon segue as odds da fonte', () => {
    const n = quadrantes.length
    const frac = (k: number) =>
      quadrantes.filter((q) => q.klingons === k).length / n
    expect(frac(0)).toBeGreaterThan(0.74)
    expect(frac(0)).toBeLessThan(0.86)
    expect(frac(1)).toBeGreaterThan(0.1)
    expect(frac(1)).toBeLessThan(0.2)
    expect(frac(3)).toBeLessThan(0.06)
  })

  it('total de inimigos fica na faixa esperada (~17)', () => {
    const totais = Array.from({ length: 40 }, (_, i) => world(i + 1).enemyTotal)
    const media = totais.reduce((a, b) => a + b, 0) / totais.length
    expect(media).toBeGreaterThan(13)
    expect(media).toBeLessThan(22)
  })

  it('~50% dos quadrantes têm planeta', () => {
    const frac = quadrantes.filter((q) => q.planet).length / quadrantes.length
    expect(frac).toBeGreaterThan(0.42)
    expect(frac).toBeLessThan(0.58)
  })

  it('~30% dos planetas têm dilítium, 1-3 cargas', () => {
    const planetas = quadrantes.filter((q) => q.planet)
    const comCarga = planetas.filter((q) => q.dilithiumCharges > 0)
    const frac = comCarga.length / planetas.length
    expect(frac).toBeGreaterThan(0.22)
    expect(frac).toBeLessThan(0.38)
    for (const q of comCarga) {
      expect(q.dilithiumCharges).toBeGreaterThanOrEqual(1)
      expect(q.dilithiumCharges).toBeLessThanOrEqual(3)
    }
  })

  it('planeta sem dilítium tem exatamente 0 cargas', () => {
    for (const q of quadrantes.filter((x) => !x.planet)) {
      expect(q.dilithiumCharges).toBe(0)
    }
  })
})

describe('materialização de setor', () => {
  const content = (over: Partial<QuadrantContent> = {}): QuadrantContent => ({
    klingons: 2,
    baseIds: [],
    stars: 5,
    planet: false,
    dilithiumCharges: 0,
    surveyed: false,
    clearedEnemies: 0,
    ...over,
  })

  it('KBS 215 materializa 2 inimigos + 1 base + 5 estrelas', () => {
    const starbases = world(5).starbases.slice(0, 1)
    const ents = materializeSector(
      content({ baseIds: [starbases[0].id] }),
      { row: 3, col: 4 },
      1,
      starbases,
    )
    const count = (t: string) => ents.filter((e) => e.type === t).length
    // `enemy-species`: os 2 inimigos podem ser qualquer um dos 5 tipos, o
    // sorteio ponderado não crava mais tudo em KLINGON_CRUISER.
    expect(ents.filter((e) => isEnemy(e.type)).length).toBe(2)
    expect(count(SectorEntityType.STAR)).toBe(5)
    expect(
      ents.filter((e) => e.type.startsWith('starbase')).length,
    ).toBe(1)
  })

  it('nenhuma célula recebe duas entidades', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const ents = materializeSector(
        content({ klingons: 3, stars: 8, planet: true }),
        { row: 1, col: 1 },
        seed,
      )
      const celulas = ents.map((e) => `${e.position.row},${e.position.col}`)
      expect(new Set(celulas).size).toBe(celulas.length)
    }
  })

  it('inimigo destruído não reaparece ao reentrar', () => {
    const ents = materializeSector(
      content({ klingons: 3, clearedEnemies: 2 }),
      { row: 2, col: 2 },
      9,
    )
    expect(ents.filter((e) => isEnemy(e.type))).toHaveLength(1)
  })

  it('inimigos nascem com enemyPower dentro da faixa da PRÓPRIA espécie', () => {
    const ents = materializeSector(
      content({ klingons: 3 }),
      { row: 2, col: 2 },
      4,
    )
    for (const e of ents.filter((x) => isEnemy(x.type))) {
      const [lo, hi] = ENEMY_POWER_BAND[e.type] ?? [0.5, 1.5]
      expect(e.enemyPower!).toBeGreaterThanOrEqual(ENEMY_BASE_POWER * lo)
      expect(e.enemyPower!).toBeLessThanOrEqual(ENEMY_BASE_POWER * hi)
    }
  })

  it('planeta carrega as cargas do quadrante e nasce não-pesquisado', () => {
    const ents = materializeSector(
      content({ planet: true, dilithiumCharges: 2 }),
      { row: 6, col: 6 },
      3,
    )
    const planeta = ents.find((e) => e.type === SectorEntityType.PLANET)!
    expect(planeta.dilithiumCharges).toBe(2)
    expect(planeta.surveyed).toBe(false)
  })

  it('layout é ESTÁVEL entre visitas ao mesmo quadrante', () => {
    // Regressão: antes o layout vinha do stream de RNG do chamador, então sair e
    // voltar reposicionava estrelas e bases (elas se teleportavam), e a posição
    // inicial não tinha como prever o layout real. Agora deriva de
    // semente+quadrante.
    const c = content({ klingons: 2, stars: 6, planet: true })
    const primeira = materializeSector(c, { row: 5, col: 3 }, 777)
    const segunda = materializeSector(c, { row: 5, col: 3 }, 777)
    expect(segunda.map((e) => [e.id, e.position])).toEqual(
      primeira.map((e) => [e.id, e.position]),
    )
  })

  it('quadrantes diferentes têm layouts diferentes na mesma semente', () => {
    const c = content({ klingons: 2, stars: 6 })
    const a = materializeSector(c, { row: 1, col: 1 }, 777)
    const b = materializeSector(c, { row: 8, col: 8 }, 777)
    expect(a.map((e) => e.position)).not.toEqual(b.map((e) => e.position))
  })

  it('ids são estáveis e únicos dentro do setor', () => {
    const args = [content({ klingons: 2, planet: true }), { row: 7, col: 7 }] as const
    const a = materializeSector(args[0], args[1], 2)
    const b = materializeSector(args[0], args[1], 2)
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id))
    expect(new Set(a.map((e) => e.id)).size).toBe(a.length)
  })
})

describe('enemy-species — os 5 tipos nascem de verdade', () => {
  const content = (over: Partial<QuadrantContent> = {}): QuadrantContent => ({
    klingons: 3,
    baseIds: [],
    stars: 5,
    planet: false,
    dilithiumCharges: 0,
    surveyed: false,
    clearedEnemies: 0,
    ...over,
  })

  it('os 5 tipos aparecem numa amostra grande, nas proporções tabeladas', () => {
    const counts: Record<string, number> = Object.fromEntries(
      ENEMY_TYPES.map((t) => [t, 0]),
    )
    let total = 0
    for (let seed = 1; seed <= 300; seed++) {
      const ents = materializeSector(content(), { row: 2, col: 2 }, seed)
      for (const e of ents.filter((x) => isEnemy(x.type))) {
        counts[e.type]++
        total++
      }
    }
    // Todos os 5 apareceram — nenhum ficou em 0.
    for (const t of ENEMY_TYPES) expect(counts[t]).toBeGreaterThan(0)

    // Peso tabelado: klingon_cruiser 35%, klingon_d7 20%, romulan_warbird 15%,
    // romulan_scout 20%, cloaked_raider 10%. Margem generosa (amostra finita).
    expect(counts[SectorEntityType.KLINGON_CRUISER] / total).toBeGreaterThan(0.25)
    expect(counts[SectorEntityType.KLINGON_CRUISER] / total).toBeLessThan(0.45)
    expect(counts[SectorEntityType.CLOAKED_RAIDER] / total).toBeLessThan(0.18)
  })

  it('mesma semente reproduz os mesmos tipos, nas mesmas células', () => {
    const a = materializeSector(content(), { row: 3, col: 3 }, 555)
    const b = materializeSector(content(), { row: 3, col: 3 }, 555)
    expect(a.map((e) => ({ type: e.type, position: e.position }))).toEqual(
      b.map((e) => ({ type: e.type, position: e.position })),
    )
  })

  it('CLOAKED_RAIDER sempre materializa cloacado', () => {
    let found = false
    for (let seed = 1; seed <= 300; seed++) {
      const ents = materializeSector(content(), { row: 2, col: 2 }, seed)
      for (const e of ents.filter(
        (x) => x.type === SectorEntityType.CLOAKED_RAIDER,
      )) {
        found = true
        expect(e.cloaked).toBe(true)
      }
    }
    expect(found).toBe(true)
  })

  it('scout nasce numa faixa de poder estritamente mais fraca que o warbird', () => {
    const [scoutLo, scoutHi] = ENEMY_POWER_BAND[SectorEntityType.ROMULAN_SCOUT]
    const [warbirdLo] = ENEMY_POWER_BAND[SectorEntityType.ROMULAN_WARBIRD]
    expect(scoutHi).toBeLessThanOrEqual(warbirdLo)
    expect(scoutLo).toBeLessThan(warbirdLo)
  })

  it('a faixa do cruiser é a mesma que todo inimigo usava antes (0.5–1.5)', () => {
    expect(ENEMY_POWER_BAND[SectorEntityType.KLINGON_CRUISER]).toEqual([0.5, 1.5])
  })
})

describe('posição inicial', () => {
  it('nave nunca nasce sobre outra entidade', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const w = world(seed)
      const content = w.galaxy[quadrantKey(w.position.quadrant)]
      const ents = materializeSector(
        content,
        w.position.quadrant,
        seed,
        w.starbases,
      )
      // A célula inicial não pode coincidir com entidade alguma do setor
      // materializado com a MESMA semente de layout.
      const ocupadas = new Set(
        ents.map((e) => `${e.position.row},${e.position.col}`),
      )
      const inicial = `${w.position.sector.row},${w.position.sector.col}`
      expect(ocupadas.has(inicial)).toBe(false)
    }
  })

  it('posição inicial está dentro do grid', () => {
    const { position } = world(11)
    for (const c of [position.quadrant, position.sector]) {
      expect(c.row).toBeGreaterThanOrEqual(1)
      expect(c.row).toBeLessThanOrEqual(8)
      expect(c.col).toBeGreaterThanOrEqual(1)
      expect(c.col).toBeLessThanOrEqual(8)
    }
  })
})

describe('salvaguarda do relógio da missão', () => {
  it('limite de stardate cobre a frota gerada', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const w = world(seed)
      expect(w.stardateLimit).toBeGreaterThan(3600 + w.enemyTotal)
    }
  })
})
