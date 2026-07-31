/**
 * Testes do modo de viagem e da fila de apresentação.
 *
 * Usam timers falsos: a store é o único lugar com relógio de tempo real, e é
 * justamente isso que precisa ser verificado sem esperar 30 s de verdade.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameState } from '@/stores/useGameState'
import { usePresentation } from '@/stores/usePresentation'
import {
  TURN_EVENT_PRESENT_MS,
  WARP_ANIMATION_MS,
  warpAnimationMs,
} from '@/engine/constants'
import type { SectorEntity } from '@/types/game'

/**
 * Avança os timers em fatias, deixando os `await` internos resolverem entre
 * elas. Um turno de viagem termina em `await commitTurnChecksum` (SHA-256 via
 * `crypto.subtle`), e o timer seguinte só é agendado depois dessa promessa —
 * um único salto de `N × LUT` para no primeiro turno.
 */
async function advance(ms: number) {
  const step = 250
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    await vi.advanceTimersByTimeAsync(step)
  }
}

describe('stores/usePresentation — modo de viagem', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    usePresentation().cancel()
    vi.useRealTimers()
  })

  it('viagem multi-turno resolve sozinha, sem input do jogador', async () => {
    const gs = useGameState()
    const pres = usePresentation()
    // Warp 1 pra garantir mais de um turno: distância 3 -> 3 turnos.
    gs.$state.warpFactor = 1
    gs.$state.position.quadrant = { row: 1, col: 1 }
    const destino = { row: 4, col: 1 }

    const res = await gs.moveWarp(destino)
    expect(res.warpTripStarted).toEqual({ warpFactor: 1, turns: 3 })
    expect(pres.travelling).toBe(true)
    // O 1º turno resolveu junto com o engage; ainda faltam 2.
    expect(gs.warpTrip?.turnsRemaining).toBe(2)

    // Nenhum clique — só o relógio.
    await advance(warpAnimationMs(1) * 3)

    expect(gs.warpTrip).toBeNull()
    expect(gs.position.quadrant).toEqual(destino)
    expect(pres.travelling).toBe(false)
  })

  it('viagem de 1 turno ainda ganha o seu intervalo de animação', async () => {
    const gs = useGameState()
    const pres = usePresentation()
    gs.$state.warpFactor = 8
    gs.$state.position.quadrant = { row: 1, col: 1 }

    // Distância 1 a warp 8 = 1 turno: nasce e morre dentro da mesma resolução.
    await gs.moveWarp({ row: 2, col: 1 })
    expect(gs.warpTrip).toBeNull()
    // Sem `warpTripStarted` isto seria `false` e a animação não aconteceria —
    // era o bug que o piso fixo de 5 s existia pra mascarar.
    expect(pres.travelling).toBe(true)

    await advance(warpAnimationMs(8))
    expect(pres.travelling).toBe(false)
  })

  it('engajar warp esvazia o setor e a chegada repovoa o destino', async () => {
    const gs = useGameState()
    gs.$state.warpFactor = 1
    gs.$state.position.quadrant = { row: 1, col: 1 }
    const inimigo: SectorEntity = {
      id: 'k1',
      type: 'klingon_cruiser',
      position: { row: 5, col: 5 },
      enemyPower: 300,
      cloaked: false,
    }
    gs.$state.currentSector = [inimigo]

    await gs.moveWarp({ row: 3, col: 1 })
    // Fuga limpa: ninguém alcança a nave em trânsito.
    expect(gs.currentSector).toEqual([])

    await advance(warpAnimationMs(1) * 2)
    // Toda célula da galáxia tem >= 1 estrela: setor vazio aqui = hook desligado.
    expect(gs.currentSector.length).toBeGreaterThan(0)
  })

  it('ação que consome turno é recusada em trânsito, sem gastar turno', async () => {
    const gs = useGameState()
    gs.$state.warpFactor = 1
    gs.$state.position.quadrant = { row: 1, col: 1 }
    await gs.moveWarp({ row: 4, col: 1 })

    const stardate = gs.stardate
    const res = await gs.firePhasers()

    expect(res.rejected).toBe(true)
    expect(res.rejectionReason).toMatch(/warp/i)
    expect(gs.stardate).toBe(stardate)
  })

  it('ajuste livre continua passando em trânsito', async () => {
    const gs = useGameState()
    gs.$state.warpFactor = 1
    gs.$state.position.quadrant = { row: 1, col: 1 }
    await gs.moveWarp({ row: 4, col: 1 })

    gs.lowerShields()
    expect(gs.shieldEnergy).toBe(0)
    expect(gs.dispatchTeam('team-1', 'phasers')).not.toBe(false)
  })

  it('a LUT nunca deixa a viagem mais longa ao subir o fator de warp', () => {
    // A regressão exata que uma rampa CRESCENTE de ms/turno teria introduzido:
    // warps 4, 5 e 6 custam os mesmos 2 turnos na diagonal, então subir a
    // velocidade deixaria a viagem mais demorada.
    const distancia = 7
    let anterior = Infinity
    for (let fator = 1; fator <= 8; fator++) {
      const total = Math.ceil(distancia / fator) * warpAnimationMs(fator)
      expect(total).toBeLessThanOrEqual(anterior)
      anterior = total
    }
  })

  it('a LUT é não-crescente e sem piso/teto aplicado', () => {
    for (let i = 1; i < WARP_ANIMATION_MS.length; i++) {
      expect(WARP_ANIMATION_MS[i]).toBeLessThanOrEqual(WARP_ANIMATION_MS[i - 1])
    }
    expect(warpAnimationMs(1)).toBe(4300)
    expect(warpAnimationMs(8)).toBe(3000)
  })
})

describe('stores/usePresentation — fila', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    usePresentation().cancel()
    vi.useRealTimers()
  })

  it('drena os eventos de combate na ordem e só eles', async () => {
    const pres = usePresentation()
    pres.enqueue([
      { step: 1, type: 'player_phasers', entityId: 'k1', amount: 10, text: 'a' },
      { step: 5, type: 'repair', amount: 3, text: 'b' },
      { step: 3, type: 'enemy_attack', entityId: 'k1', amount: 7, text: 'c' },
    ])

    // Reparo é bookkeeping: aplica direto, não entra em cena.
    expect(pres.current?.text).toBe('a')
    expect(pres.queue.map((e) => e.text)).toEqual(['c'])

    await advance(TURN_EVENT_PRESENT_MS)
    expect(pres.current?.text).toBe('c')

    await advance(TURN_EVENT_PRESENT_MS)
    expect(pres.current).toBeNull()
    expect(pres.presenting).toBe(false)
  })

  it('turno tranquilo não gera espera nenhuma', () => {
    const pres = usePresentation()
    pres.enqueue([
      { step: 5, type: 'repair', amount: 3, text: 'reparo' },
      { step: 5, type: 'movement', text: 'chegada' },
    ])
    expect(pres.presenting).toBe(false)
    expect(pres.busy).toBe(false)
  })

  it('turno novo é recusado enquanto a fila drena, sem sobrescrevê-la', async () => {
    const gs = useGameState()
    const pres = usePresentation()
    pres.enqueue([
      { step: 3, type: 'enemy_attack', entityId: 'k1', amount: 7, text: 'a' },
      { step: 3, type: 'shield_absorb', entityId: 'k1', amount: 7, text: 'b' },
    ])
    const stardate = gs.stardate

    const res = await gs.executeEndTurn()
    expect(res.rejected).toBe(true)
    expect(gs.stardate).toBe(stardate)
    expect(pres.queue.map((e) => e.text)).toEqual(['b'])
  })

  it('cancel não deixa timer vivo', async () => {
    const pres = usePresentation()
    pres.enqueue([
      { step: 3, type: 'enemy_attack', entityId: 'k1', amount: 7, text: 'a' },
      { step: 3, type: 'shield_absorb', entityId: 'k1', amount: 7, text: 'b' },
    ])
    pres.cancel()

    expect(pres.current).toBeNull()
    expect(pres.busy).toBe(false)
    await advance(TURN_EVENT_PRESENT_MS * 5)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('stores/usePresentation — snapshot do setor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => {
    usePresentation().cancel()
    vi.useRealTimers()
  })

  const klingon = (id: string, row: number, col: number): SectorEntity => ({
    id,
    type: 'klingon_cruiser',
    position: { row, col },
    enemyPower: 300,
    cloaked: false,
  })

  it('sem nada em cena, a view é o estado resolvido', () => {
    const gs = useGameState()
    const pres = usePresentation()
    gs.$state.currentSector = [klingon('k1', 5, 5)]
    gs.$state.position.sector = { row: 2, col: 2 }

    expect(pres.sectorView?.entities).toEqual(gs.currentSector)
    expect(pres.sectorView?.ship).toEqual({ row: 2, col: 2 })
  })

  it('enquanto a fila drena, a view é o congelado — não o resolvido', async () => {
    const gs = useGameState()
    const pres = usePresentation()
    gs.$state.currentSector = [klingon('k1', 5, 5)]
    gs.$state.position.sector = { row: 2, col: 2 }

    pres.captureSector()
    // O engine "resolve": o inimigo morre e a nave se move.
    gs.$state.currentSector = []
    gs.$state.position.sector = { row: 4, col: 4 }
    pres.enqueue([
      { step: 1, type: 'player_phasers', entityId: 'k1', at: { row: 5, col: 5 }, text: 'a' },
    ])

    // O alvo destruído segue desenhado enquanto o tiro que o matou é encenado,
    // e a nave segue na célula de onde atirou.
    expect(pres.sectorView?.entities.map((e) => e.id)).toEqual(['k1'])
    expect(pres.sectorView?.ship).toEqual({ row: 2, col: 2 })

    await advance(TURN_EVENT_PRESENT_MS * 2)
    expect(pres.presenting).toBe(false)
    expect(pres.sectorView?.entities).toEqual([])
    expect(pres.sectorView?.ship).toEqual({ row: 4, col: 4 })
  })

  it('turno sem nada encenável assenta na hora', () => {
    const gs = useGameState()
    const pres = usePresentation()
    gs.$state.currentSector = [klingon('k1', 5, 5)]

    pres.captureSector()
    gs.$state.currentSector = []
    pres.enqueue([{ step: 5, type: 'repair', text: 'reparo' }])

    expect(pres.sectorSnapshot).toBeNull()
    expect(pres.sectorView?.entities).toEqual([])
  })

  it('em warp a view é nula: grid em branco até a animação terminar', async () => {
    const gs = useGameState()
    const pres = usePresentation()
    gs.$state.warpFactor = 1
    gs.$state.position.quadrant = { row: 1, col: 1 }

    await gs.moveWarp({ row: 3, col: 1 })
    expect(pres.travelling).toBe(true)
    // Destino já povoado no estado, mas o scanner não pode entregá-lo ainda.
    expect(pres.sectorView).toBeNull()

    await advance(warpAnimationMs(1) * 3)
    expect(pres.travelling).toBe(false)
    expect(pres.sectorView).not.toBeNull()
    expect(pres.sectorView?.entities.length).toBeGreaterThan(0)
  })

  it('recapturar durante a viagem não substitui o congelado', () => {
    const gs = useGameState()
    const pres = usePresentation()
    gs.$state.currentSector = [klingon('k1', 5, 5)]

    pres.captureSector()
    gs.$state.currentSector = [klingon('k2', 1, 1)]
    pres.captureSector()

    expect(pres.sectorSnapshot?.entities.map((e) => e.id)).toEqual(['k1'])
  })
})
