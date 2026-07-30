/**
 * Store Pinia — camada FINA sobre o engine (`src/engine/*.ts`).
 *
 * A regra de jogo mora no engine (TS puro, testável sem montar Vue); esta
 * store só guarda o `GameState`, expõe leitura reativa pros consoles e delega
 * toda mutação pro engine (design.md decisão #3). Persistência é automática
 * via `pinia-plugin-persistedstate`, sem código de serialização manual.
 */

import { defineStore } from 'pinia'
import { clamp, computeShieldIntegrity } from '@/engine/constants'
import { createNewGameState } from '@/engine/newGame'
import type { GameState } from '@/types/game'
import {
  resolvePlayerTurn,
  endTurn,
  skipTurns,
  dockAndRepairTurn,
  type PlayerAction,
  type TurnResult,
} from '@/engine/turnEngine'
import { commitTurnChecksum, verifySaveIntegrity } from '@/engine/saveIntegrity'
import { advanceTribbleInfestation } from '@/engine/tribbleInfestation'

export const GAME_STATE_STORAGE_KEY = 'sst-lcars-game-state'

export const useGameState = defineStore('gameState', {
  state: (): GameState => createNewGameState(),

  getters: {
    shieldIntegrity(state): number {
      return computeShieldIntegrity(state.shieldEnergy, state.shieldDamageTaken)
    },
  },

  actions: {
    /** Reinicia tudo pras constantes iniciais e sela com novo checksum. */
    async newGame() {
      this.$patch(createNewGameState())
      await commitTurnChecksum(this.$state)
    },

    /** Dispara ação que consome 1 turno no motor principal e atualiza o checksum. */
    async dispatchPlayerAction(action: PlayerAction): Promise<TurnResult> {
      const res = resolvePlayerTurn(this.$state, action)
      if (this.$state.tribbleInfestationActive) {
        advanceTribbleInfestation(this.$state)
      }
      await commitTurnChecksum(this.$state)
      return res
    },

    /** End Turn: avanço de 1 turno sem ação de jogador. */
    async executeEndTurn(): Promise<TurnResult> {
      const res = endTurn(this.$state)
      if (this.$state.tribbleInfestationActive) {
        advanceTribbleInfestation(this.$state)
      }
      await commitTurnChecksum(this.$state)
      return res
    },

    /** Skip N Turns: avança em lote até count turnos ou condição de interrupção. */
    async executeSkipTurns(count: number) {
      const res = skipTurns(this.$state, count)
      if (this.$state.tribbleInfestationActive) {
        advanceTribbleInfestation(this.$state)
      }
      await commitTurnChecksum(this.$state)
      return res
    },

    /** Turno de reparo em modo Docking (STARBASE_DOCK). */
    async executeDockingRepairTurn(): Promise<TurnResult> {
      const res = dockAndRepairTurn(this.$state)
      await commitTurnChecksum(this.$state)
      return res
    },

    /** Verificação do selo SHA-256 após reload (detecta adulteração e carrega estado). */
    async checkSaveIntegrity(raw: unknown): Promise<void> {
      const state = await verifySaveIntegrity(raw)
      this.$patch(state)
    },

    // ── Ajustes livres (sem custo de turno, sem invocar turnEngine) ─────────

    setImpulsePower(power: number) {
      this.$state.impulsePower = clamp(power, 0, 100)
    },

    setWarpFactor(factor: number) {
      this.$state.warpFactor = clamp(factor, 1, 8)
    },

    toggleBoost() {
      if (this.$state.boostCooldown === 0) {
        this.$state.boostActive = !this.$state.boostActive
      }
    },

    setDestination(coord: { row: number; col: number } | null) {
      this.$state.destination = coord
    },

    setPhaserPower(power: number) {
      this.$state.phaserPower = clamp(power, 0, 100)
    },

    setManualOverload(overload: number) {
      this.$state.manualOverload = clamp(overload, 0, 20)
    },

    toggleSubsystemOn(key: 'srs' | 'lrs' | 'photons' | 'autoNav') {
      this.$state.subsystemsOn[key] = !this.$state.subsystemsOn[key]
    },

    transferToShields(amount: number) {
      const space = Math.max(0, 2500 - this.$state.shieldEnergy)
      const actual = Math.min(amount, this.$state.mainEnergy, space)
      this.$state.mainEnergy -= actual
      this.$state.shieldEnergy += actual
    },

    transferFromShields(amount: number) {
      const space = Math.max(0, 4500 - this.$state.mainEnergy)
      const actual = Math.min(amount, this.$state.shieldEnergy, space)
      this.$state.shieldEnergy -= actual
      this.$state.mainEnergy += actual
    },

    setShieldEnergyTo(target: number) {
      const current = this.$state.shieldEnergy
      if (target > current) {
        this.transferToShields(target - current)
      } else if (target < current) {
        this.transferFromShields(current - target)
      }
    },

    raiseShields() {
      this.transferToShields(2500 - this.$state.shieldEnergy)
    },

    lowerShields() {
      this.transferFromShields(this.$state.shieldEnergy)
    },
  },

  persist: {
    key: GAME_STATE_STORAGE_KEY,
  },
})
