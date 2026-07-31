/**
 * Store de APRESENTAÇÃO: distribui no tempo o que o engine já resolveu num
 * instante, e conduz o modo de viagem de warp.
 *
 * Por que fora do `GameState`, contrariando a redação literal das tasks 2.4/3.1:
 * `saveIntegrity.computeChecksum` hasheia **todos** os campos do `GameState`.
 * Fila e flags são transitórias — seriam seladas no meio da drenagem e voltariam
 * vazias no reload, e o digest divergente ligaria a infestação de Tribbles num
 * save honesto. Persistir também não serve: `presenting: true` gravado no
 * localStorage travaria a partida na volta. Estado transitório mora aqui.
 *
 * Um único dono de timer, como manda a decisão 2 do design — a
 * `engine-integration` já entregou um bug dessa forma (`warpVisualTimer`
 * sobrevivendo ao unmount do `HelmConsole`).
 */

import { defineStore } from 'pinia'
import { TURN_EVENT_PRESENT_MS, warpAnimationMs } from '@/engine/constants'
import type { GridCoord, SectorEntity, TurnEvent, TurnEventType } from '@/types/game'
import { useGameState } from '@/stores/useGameState'
import { HULL_HIT_SOUNDS, Sound, useSound } from '@/composables/useSound'

/** O setor como estava no início do turno, enquanto a fila drena. */
export interface SectorSnapshot {
  entities: SectorEntity[]
  ship: GridCoord
}

/**
 * Só efeito de combate é encenado. Encenar tudo faria um turno tranquilo demorar
 * o mesmo que uma batalha, à toa (design.md decisão 8) — reparo de CdD, regen de
 * pool de base e avanço de stardate aplicam direto.
 */
const STAGED_TYPES: ReadonlySet<TurnEventType> = new Set<TurnEventType>([
  'player_phasers',
  'player_torpedo',
  'enemy_attack',
  'shield_absorb',
  'hull_damage',
  'subsystem_hit',
])

/**
 * Timers fora do state reativo: são handles, não dado de UI, e mantê-los aqui
 * garante um ponto único de limpeza.
 */
let stageTimer: ReturnType<typeof setTimeout> | undefined
let travelTimer: ReturnType<typeof setTimeout> | undefined

export const usePresentation = defineStore('presentation', {
  state: () => ({
    /** Eventos ainda por encenar, na ordem em que o engine os produziu. */
    queue: [] as TurnEvent[],
    /** Evento em cena agora. É o que a camada de animação lê. */
    current: null as TurnEvent | null,
    /**
     * Contador monotônico de eventos encenados. Serve de `key` pra animação:
     * dois disparos iguais em sequência (mesmo tipo, mesmo alvo) produziriam
     * elementos idênticos e o navegador não reiniciaria a animação do segundo.
     */
    sequence: 0,
    /** Viagem de warp em curso conduzida por esta store. */
    travelling: false,
    /** Fator da viagem atual — define a duração de cada intervalo pela LUT. */
    travelFactor: 1,
    /** Intervalos de animação ainda por cumprir. Total = turnos da viagem. */
    travelWaits: 0,
    /** Turnos de engine ainda por avançar. Total = turnos − 1 (o 1º já resolveu). */
    travelTurns: 0,
    /**
     * Setor congelado no início do turno. Enquanto existe, é ELE que os
     * scanners desenham — não `gameState.currentSector`.
     *
     * O engine resolve o turno inteiro antes do primeiro evento entrar em cena,
     * então o estado vivo já é o final: inimigo que se moveu está no destino
     * enquanto o feixe dele ancora na origem, e inimigo destruído já sumiu
     * enquanto o tiro que o matou ainda está sendo desenhado. `evt.at` guarda a
     * célula do instante da emissão (decisão certa — entidade morta não tem
     * posição viva pra ler), e era o grid que discordava.
     */
    sectorSnapshot: null as SectorSnapshot | null,
  }),

  getters: {
    presenting(state): boolean {
      return state.current !== null || state.queue.length > 0
    },

    /**
     * O que os scanners devem desenhar AGORA.
     *
     * `null` = grid em branco: a nave está em bolha de warp, fora de alcance, e
     * o setor de destino ainda não é dela. Mostrar o destino no instante do
     * engage entregava a chegada antes da animação rodar.
     */
    sectorView(state): SectorSnapshot | null {
      if (state.travelling) return null
      if (state.sectorSnapshot) return state.sectorSnapshot
      const game = useGameState()
      return { entities: game.currentSector, ship: game.position.sector }
    },

    /**
     * Flag ÚNICA que todo console lê pra desabilitar ação que consome turno.
     * Nenhum console decide por conta própria — senão eles discordam sobre
     * quando o jogador pode agir.
     */
    busy(): boolean {
      return this.presenting || this.travelling
    },
  },

  actions: {
    /**
     * Congela o setor ANTES de o engine resolver o turno.
     *
     * No-op se já houver snapshot: uma viagem de warp resolve vários turnos
     * (`scheduleTravelTurn` chama `executeEndTurn`), e recapturar a cada um
     * substituiria o congelado pelo estado já movido.
     */
    captureSector() {
      if (this.sectorSnapshot) return
      const game = useGameState()
      this.sectorSnapshot = {
        // Cópia rasa das entidades: a apresentação lê posição e tipo, e o
        // engine substitui entidades em vez de mutá-las no lugar.
        entities: game.currentSector.map((e) => ({ ...e })),
        ship: { ...game.position.sector },
      }
    },

    /**
     * Devolve o grid ao estado resolvido, quando não há mais nada em cena nem
     * viagem em curso. Chamada dos dois pontos que podem ser o último a
     * terminar — fila e viagem — porque qualquer um deles pode acabar por
     * último.
     */
    settle() {
      if (this.presenting || this.travelling) return
      this.sectorSnapshot = null
    },

    /** Enfileira os eventos encenáveis de um turno resolvido. */
    enqueue(events: TurnEvent[]) {
      const staged = events.filter((e) => STAGED_TYPES.has(e.type))
      if (staged.length === 0) {
        // Turno tranquilo: nada a encenar, o grid assenta na hora em vez de o
        // jogador olhar pro setor congelado sem motivo.
        this.settle()
        return
      }
      this.queue.push(...staged)
      if (!this.current) this.advance()
    },

    /** Põe o próximo evento em cena, toca o som dele e agenda o seguinte. */
    advance() {
      clearTimeout(stageTimer)
      const next = this.queue.shift()
      if (!next) {
        this.current = null
        this.settle()
        return
      }
      this.current = next
      this.sequence += 1
      this.playEventSound(next)
      stageTimer = setTimeout(() => this.advance(), TURN_EVENT_PRESENT_MS)
    },

    /**
     * Som do impacto, no instante em que o evento entra em cena.
     *
     * Disparo já tinha som (phaser e torpedo tocam no tiro); faltava a
     * chegada — o jogador se ouvia atirar e via o dano aparecer em silêncio. A
     * fila é o único lugar onde o momento do impacto existe como instante, e
     * não como número que mudou.
     */
    playEventSound(evt: TurnEvent) {
      const { playSound } = useSound()
      if (evt.type === 'shield_absorb') {
        playSound(Sound.SHIELD_SIZZLE)
      } else if (evt.type === 'hull_damage') {
        playSound(HULL_HIT_SOUNDS[Math.floor(Math.random() * HULL_HIT_SOUNDS.length)])
      }
      if (evt.destroyed) playSound(Sound.EXPLOSION)
    },

    /**
     * Inicia o modo de viagem: os turnos restantes avançam sozinhos, com a
     * duração da LUT entre eles. Clicar "End Turn" 7 vezes numa travessia em
     * warp 1 não é decisão, é ruído.
     *
     * `turns` vem do `TurnResult`, não de `state.warpTrip`: numa viagem de 1
     * turno o trip já foi criado E zerado dentro da resolução do engage, e ler
     * o estado depois daria zero.
     *
     * São `turns` intervalos e `turns - 1` turnos de engine — o primeiro turno
     * resolveu junto com o engage, mas ainda precisa do seu intervalo de tela.
     */
    beginTravel(trip: { warpFactor: number; turns: number }) {
      if (this.travelling) return
      this.travelling = true
      this.travelFactor = trip.warpFactor
      this.travelWaits = trip.turns
      this.travelTurns = trip.turns - 1
      this.scheduleTravelTurn()
    },

    scheduleTravelTurn() {
      clearTimeout(travelTimer)
      travelTimer = setTimeout(async () => {
        const game = useGameState()
        this.travelWaits -= 1

        if (this.travelTurns > 0) {
          // Viagem interrompida por fora (motor crítico aborta, fim de jogo):
          // não há mais o que avançar, e esperar os intervalos restantes só
          // deixaria o jogador olhando pra uma animação sem viagem.
          if (!game.warpTrip || game.mode === 'result') {
            this.endTravel()
            return
          }
          await game.executeEndTurn()
          this.travelTurns -= 1
        }

        if (this.travelWaits > 0 && game.mode !== 'result') {
          this.scheduleTravelTurn()
        } else {
          this.endTravel()
        }
      }, warpAnimationMs(this.travelFactor))
    },

    endTravel() {
      clearTimeout(travelTimer)
      travelTimer = undefined
      this.travelling = false
      this.travelWaits = 0
      this.travelTurns = 0
      // Chegada: o setor de destino aparece agora, não no engage.
      this.settle()
    },

    /** Cancela tudo. Chamada no unmount da tela de jogo e no New Game. */
    cancel() {
      clearTimeout(stageTimer)
      stageTimer = undefined
      this.queue = []
      this.current = null
      this.endTravel()
      this.sectorSnapshot = null
    },
  },
})
