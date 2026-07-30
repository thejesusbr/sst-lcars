/**
 * Store Pinia — camada FINA sobre o engine (`src/engine/*.ts`).
 *
 * A regra de jogo mora no engine (TS puro, testável sem montar Vue); esta
 * store só guarda o `GameState`, expõe leitura reativa pros consoles e delega
 * toda mutação pro engine (design.md decisão #3). Persistência é automática
 * via `pinia-plugin-persistedstate`, sem código de serialização manual.
 */

import { defineStore } from 'pinia'
import {
  PHASER_POWER_MAX,
  SHIELD_ENERGY_MAX,
  clamp,
  computeShieldIntegrity,
  kbsCode,
  warpCoreOutput,
} from '@/engine/constants'
import { createNewGameState } from '@/engine/newGame'
import {
  type AlertLevel,
  type GameState,
  type GridCoord,
  type LogCategory,
  type SubsystemKey,
} from '@/types/game'
import {
  resolvePlayerTurn,
  endTurn,
  skipTurns,
  dockAndRepairTurn,
  type PlayerAction,
  type TurnOptions,
  type TurnResult,
} from '@/engine/turnEngine'
import { commitTurnChecksum, verifySaveIntegrity } from '@/engine/saveIntegrity'
import { advanceTribbleInfestation } from '@/engine/tribbleInfestation'
import { subsystemDraw } from '@/engine/warpCore'
import {
  dispatchTeam as engineDispatchTeam,
  recallTeam as engineRecallTeam,
} from '@/engine/damageControl'
import { dock as engineDock, undock as engineUndock, canDock } from '@/engine/docking'
import { cycleTorpedoTarget } from '@/engine/combat'
import { materializeSector } from '@/engine/worldGen'
import { lrsNeighborhood, scanConfidence } from '@/engine/navigation'

export const GAME_STATE_STORAGE_KEY = 'sst-lcars-game-state'

/**
 * Povoa `currentSector` ao entrar num quadrante. É a implementação real do hook
 * `onQuadrantEnter` do `turnEngine` — a store é o único lugar que pode ligar as
 * duas pontas sem o engine importar `worldGen` de dentro do `turnEngine`
 * (engine-integration design.md decisão 3).
 */
const quadrantEnterHook: TurnOptions['onQuadrantEnter'] = (state, quadrant) => {
  const content = state.galaxy?.[`${quadrant.row},${quadrant.col}`]
  if (!content) return
  state.currentSector = materializeSector(
    content,
    quadrant,
    state.seed,
    state.starbases,
  )
}

/**
 * Categoria do evento pelo texto. Heurística de palavra-chave em vez de o engine
 * carregar categoria em cada string: o engine não deve saber que existe um widget
 * de log com 3 abas.
 *
 * ponytail: classificação por substring. Se as categorias virarem regra de
 * negócio, o `TurnResult` passa a devolver `{category, text}` por evento.
 */
function categoryOf(text: string): LogCategory {
  if (/reparo|Reparo|radiação|Warp Core|contido|equipe|Equipe/i.test(text)) {
    return 'engineering'
  }
  if (/rendeu|cela|Hail|prisioneiro|missão|Sonda|sonda/i.test(text)) {
    return 'captain'
  }
  return 'general'
}

export const useGameState = defineStore('gameState', {
  state: (): GameState => createNewGameState(),

  getters: {
    shieldIntegrity(state): number {
      return computeShieldIntegrity(state.shieldEnergy, state.shieldDamageTaken)
    },

    /**
     * Consumo real somado dos 9 subsistemas. O `EngineeringConsole` mostrava um
     * número mockado; esta é a MESMA função que alimenta `autoOverload` no
     * turno, então painel e mecânica não podem divergir.
     */
    subsystemLoad(state): number {
      return subsystemDraw(state)
    },

    /**
     * Potência que o Warp Core CONSEGUE gerar agora. Cai com o dano no core
     * (`4500 × (1 - d)`), então o mesmo consumo que cabia passa a estourar o
     * orçamento — dano no core vira espiral de sobrecarga.
     */
    energyProduced(state): number {
      return warpCoreOutput(state.subsystems.warpCore)
    },

    /**
     * **Orçamento** de energia: gerada − consumida. É o que o indicador
     * "Energy Level" do SituationPanel mostra.
     *
     * Negativo = consumo passou do que o core gera, que é exatamente a condição
     * que dispara `autoOverload`. Não existe estoque de energia nesta versão
     * (ver `engine/constants.ts`): a resposta a orçamento negativo é desligar
     * subsistema, não esperar um tanque encher.
     */
    energyBudget(state): number {
      return warpCoreOutput(state.subsystems.warpCore) - subsystemDraw(state)
    },

    /** Contagem por categoria acima do marcador de leitura = aba piscando. */
    unreadByCategory(state): Record<LogCategory, number> {
      const counts: Record<LogCategory, number> = {
        captain: 0,
        general: 0,
        engineering: 0,
      }
      for (const entry of state.combatLog) counts[entry.category] += 1
      return {
        captain: Math.max(0, counts.captain - state.logReadMarkers.captain),
        general: Math.max(0, counts.general - state.logReadMarkers.general),
        engineering: Math.max(
          0,
          counts.engineering - state.logReadMarkers.engineering,
        ),
      }
    },

    /** Confiança 0-1 por quadrante explorado, pra opacidade do Star Chart. */
    quadrantConfidence(state): Record<string, number> {
      const out: Record<string, number> = {}
      for (const [key, entry] of Object.entries(state.exploredQuadrants)) {
        out[key] = scanConfidence(entry.age, state.subsystems.lrs)
      }
      return out
    },

    canDockNow(state): boolean {
      return canDock(state)
    },
  },

  actions: {
    /** Reinicia tudo pras constantes iniciais e sela com novo checksum. */
    async newGame() {
      // Object.assign, NÃO $patch: $patch faz MERGE de objetos aninhados, então
      // Records como `exploredQuadrants`/`lrsScan` acumulavam as chaves da
      // partida anterior (persistida no localStorage) — o Star Chart nascia com
      // quadrantes "explorados" da galáxia velha. Assign substitui cada campo
      // por inteiro.
      Object.assign(this.$state, createNewGameState())
      await commitTurnChecksum(this.$state)
    },

    /** Dispara ação que consome 1 turno no motor principal e atualiza o checksum. */
    async dispatchPlayerAction(action: PlayerAction): Promise<TurnResult> {
      const res = resolvePlayerTurn(this.$state, action, Math.random, {
        onQuadrantEnter: quadrantEnterHook,
      })
      this.recordTurn(res)
      // Recusa não mudou nada: não precisa reselar o save.
      if (!res.rejected) await commitTurnChecksum(this.$state)
      return res
    },

    /** End Turn: avanço de 1 turno sem ação de jogador. */
    async executeEndTurn(): Promise<TurnResult> {
      const res = endTurn(this.$state, Math.random, {
        onQuadrantEnter: quadrantEnterHook,
      })
      this.recordTurn(res)
      await commitTurnChecksum(this.$state)
      return res
    },

    /** Skip N Turns: avança em lote até count turnos ou condição de interrupção. */
    async executeSkipTurns(count: number) {
      const res = skipTurns(this.$state, count, Math.random, {
        onQuadrantEnter: quadrantEnterHook,
      })
      this.recordTurn(res.lastResult)
      await commitTurnChecksum(this.$state)
      return res
    },

    /** Turno de reparo em modo Docking (STARBASE_DOCK). */
    async executeDockingRepairTurn(): Promise<TurnResult> {
      const res = dockAndRepairTurn(this.$state, Math.random, {
        onQuadrantEnter: quadrantEnterHook,
      })
      this.recordTurn(res)
      await commitTurnChecksum(this.$state)
      return res
    },

    /**
     * Anexa os eventos do turno ao combat log e tica a infestação.
     *
     * Centralizado aqui porque os 4 caminhos de turno tinham que fazer as duas
     * coisas, e 2 deles esqueciam de uma — o log ficava vazio mesmo com o engine
     * produzindo eventos.
     */
    recordTurn(res: TurnResult) {
      for (const text of res.events) {
        this.$state.combatLog.push({
          stardate: res.stardate,
          category: categoryOf(text),
          text,
        })
      }
      if (this.$state.tribbleInfestationActive && !res.rejected) {
        advanceTribbleInfestation(this.$state)
      }
    },

    // ── Ações que consomem turno (atalhos legíveis pros consoles) ───────────

    firePhasers() {
      return this.dispatchPlayerAction({ type: 'fire_phasers' })
    },

    fireTorpedoes() {
      return this.dispatchPlayerAction({ type: 'fire_torpedoes' })
    },

    loadTube(tubeId: number) {
      return this.dispatchPlayerAction({ type: 'load_tube', tubeId })
    },

    unloadTube(tubeId: number) {
      return this.dispatchPlayerAction({ type: 'unload_tube', tubeId })
    },

    /** Reaquisição manual do Weapons Lock: consome 1 turno. */
    acquireLock() {
      return this.dispatchPlayerAction({ type: 'lock_weapons' })
    },

    hail(targetId: string) {
      return this.dispatchPlayerAction({ type: 'hail', targetId })
    },

    launchProbe(targetCoord: GridCoord) {
      return this.dispatchPlayerAction({ type: 'launch_probe', targetCoord })
    },

    /** Movimento intra-setor sob impulso. Sem alvo, usa `destinationSector`. */
    moveImpulse(targetCoord?: GridCoord) {
      return this.dispatchPlayerAction({
        type: 'move_impulse',
        targetCoord: targetCoord ?? this.$state.destinationSector ?? undefined,
      })
    },

    /** Movimento inter-quadrante. Sem alvo, usa `destination`. */
    moveWarp(targetCoord?: GridCoord) {
      return this.dispatchPlayerAction({
        type: 'move_warp',
        targetCoord: targetCoord ?? this.$state.destination ?? undefined,
      })
    },

    sendPartyTo(teamId: string, targetCoord: GridCoord) {
      return this.dispatchPlayerAction({ type: 'send_party', teamId, targetCoord })
    },

    // ── Atracagem (livre: não resolve turno) ────────────────────────────────

    dock() {
      return engineDock(this.$state)
    },

    undock() {
      engineUndock(this.$state)
    },

    /** Verificação do selo SHA-256 após reload (detecta adulteração e carrega estado). */
    async checkSaveIntegrity(raw: unknown): Promise<void> {
      // `createNewGameState()` entra como defaults de campo ausente: o engine
      // não importa a fábrica (mantém `saveIntegrity` folha), a store injeta.
      const state = await verifySaveIntegrity(raw, createNewGameState())
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

    /** Destino de SETOR (impulso). Só informa o Helm — mover é "Engage Impulse". */
    setDestinationSector(coord: { row: number; col: number } | null) {
      this.$state.destinationSector = coord
    },

    /**
     * `phaserPower` é em UNIDADES DE ENERGIA (0-3000), não em porcentagem: é
     * assim que `combat.firePhasers` e `warpCore.subsystemDraw` o leem, e
     * `newGame` o inicia em `PHASER_POWER_MAX / 2` = 1500. O clamp em `0..100`
     * daqui truncava 1500 pra 100 no primeiro toque no dial, derrubando dano e
     * consumo de phaser junto.
     */
    setPhaserPower(power: number) {
      this.$state.phaserPower = clamp(power, 0, PHASER_POWER_MAX)
    },

    setManualOverload(overload: number) {
      this.$state.manualOverload = clamp(overload, 0, 20)
    },

    toggleSubsystemOn(key: 'srs' | 'lrs' | 'photons' | 'autoNav') {
      this.$state.subsystemsOn[key] = !this.$state.subsystemsOn[key]
    },

    /**
     * Escudo é um **nível**, não uma transferência de um tanque: ajustar é livre
     * e instantâneo, e o nível resultante taxa `subsystemDraw` todo turno
     * enquanto estiver erguido (spec `energy-management`). Não há pool de origem
     * — o custo é vazão contínua, não um saque.
     */
    setShieldEnergyTo(target: number) {
      this.$state.shieldEnergy = clamp(target, 0, SHIELD_ENERGY_MAX)
    },

    transferToShields(amount: number) {
      this.setShieldEnergyTo(this.$state.shieldEnergy + amount)
    },

    transferFromShields(amount: number) {
      this.setShieldEnergyTo(this.$state.shieldEnergy - amount)
    },

    raiseShields() {
      this.setShieldEnergyTo(SHIELD_ENERGY_MAX)
    },

    lowerShields() {
      this.setShieldEnergyTo(0)
    },

    /**
     * Scan de LRS: revela o bloco 3x3 ao redor da nave e zera a idade.
     *
     * Livre (não consome turno) — o custo do LRS é o draw passivo por turno
     * enquanto ligado. Escreve em `lrsScan`, que NÃO tem memória (some no
     * próximo scan), e também em `exploredQuadrants`, que é o mapa acumulado do
     * Star Chart. Planeta fica de fora do KBS de propósito: é o que torna
     * planeta invisível a longa distância (world-generation decisão 8).
     */
    scanLongRange() {
      const scan: GameState['lrsScan'] = {}
      for (const q of lrsNeighborhood(this.$state.position.quadrant)) {
        const content = this.$state.galaxy?.[`${q.row},${q.col}`]
        if (!content) continue
        const code = kbsCode({
          klingons: content.klingons,
          bases: content.baseIds.length,
          stars: content.stars,
        })
        scan[`${q.row},${q.col}`] = { code, age: 0 }
        this.$state.exploredQuadrants[`${q.row},${q.col}`] = { code, age: 0 }
      }
      this.$state.lrsScan = scan
      this.$state.lrsScanAge = 0
    },

    setAlertLevel(level: AlertLevel) {
      this.$state.alertLevel = level
    },

    /** Toggle do SituationPanel: alterna entre `red` e `green`. */
    toggleRedAlert() {
      this.$state.alertLevel =
        this.$state.alertLevel === 'red' ? 'green' : 'red'
    },

    /** Despacho de equipe de CdD — livre, não consome turno. */
    dispatchTeam(teamId: string, system: SubsystemKey) {
      return engineDispatchTeam(this.$state, teamId, system)
    },

    recallTeam(teamId: string) {
      return engineRecallTeam(this.$state, teamId)
    },

    /** Cicla o alvo de um tubo — livre, é só mira. */
    cycleTubeTarget(tubeId: number) {
      cycleTorpedoTarget(this.$state, tubeId)
    },

    toggleTubeAutoLoad(tubeId: number) {
      const tube = this.$state.tubes.find((t) => t.id === tubeId)
      if (tube) tube.autoLoad = !tube.autoLoad
    },

    /**
     * Marca a categoria como lida até a entrada atual. Chamada SÓ quando o
     * jogador rola até o fim com a aba ativa — abrir a aba não basta
     * (`fase-4-engine` decisão #27).
     */
    markLogRead(category: LogCategory) {
      this.$state.logReadMarkers[category] = this.$state.combatLog.filter(
        (e) => e.category === category,
      ).length
    },

    setMode(mode: GameState['mode']) {
      this.$state.mode = mode
    },
  },

  persist: {
    key: GAME_STATE_STORAGE_KEY,
  },
})
