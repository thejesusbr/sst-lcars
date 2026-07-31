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
  liveKbsCode,
  warpCoreOutput,
} from '@/engine/constants'
import { createNewGameState } from '@/engine/newGame'
import {
  TURN_EVENT_CATEGORY,
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
import { usePresentation } from '@/stores/usePresentation'

export const GAME_STATE_STORAGE_KEY = 'sst-lcars-game-state'

/** Recusa da própria store (apresentação em curso), no formato de `TurnResult`. */
function refusedTurn(stardate: number, reason: string): TurnResult {
  return {
    stardate,
    events: [],
    damageTaken: 0,
    subsystemDamageTaken: false,
    breachStarted: false,
    newEnemiesEncountered: false,
    missionCompleted: false,
    terminalReason: null,
    warpCoreExploded: false,
    warpTripStarted: null,
    rejected: true,
    rejectionReason: reason,
  }
}

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
      usePresentation().cancel()
      await commitTurnChecksum(this.$state)
    },

    /** Dispara ação que consome 1 turno no motor principal e atualiza o checksum. */
    async dispatchPlayerAction(action: PlayerAction): Promise<TurnResult> {
      // Turno novo não começa por cima de uma apresentação em curso: a fila
      // seria sobrescrita no meio e o jogador perderia a metade que ainda não
      // viu — o oposto do que esta mudança existe pra resolver.
      const presentation = usePresentation()
      if (presentation.presenting) {
        return refusedTurn(this.$state.stardate, 'Aguarde a resolução do turno.')
      }

      // Congela o setor ANTES da resolução: o engine resolve o turno inteiro
      // de uma vez, então depois já não existe o estado que a animação encena.
      presentation.captureSector()
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
      if (usePresentation().presenting) {
        return refusedTurn(this.$state.stardate, 'Aguarde a resolução do turno.')
      }
      usePresentation().captureSector()
      const res = endTurn(this.$state, Math.random, {
        onQuadrantEnter: quadrantEnterHook,
      })
      this.recordTurn(res)
      await commitTurnChecksum(this.$state)
      return res
    },

    /** Skip N Turns: avança em lote até count turnos ou condição de interrupção. */
    async executeSkipTurns(count: number) {
      if (usePresentation().busy) {
        const refused = refusedTurn(this.$state.stardate, 'Aguarde a resolução do turno.')
        return { completedTurns: 0, stoppedEarly: true, lastResult: refused }
      }
      usePresentation().captureSector()
      const res = skipTurns(this.$state, count, Math.random, {
        onQuadrantEnter: quadrantEnterHook,
      })
      this.recordTurn(res.lastResult)
      await commitTurnChecksum(this.$state)
      return res
    },

    /** Turno de reparo em modo Docking (STARBASE_DOCK). */
    async executeDockingRepairTurn(): Promise<TurnResult> {
      if (usePresentation().presenting) {
        return refusedTurn(this.$state.stardate, 'Aguarde a resolução do turno.')
      }
      usePresentation().captureSector()
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
      for (const evt of res.events) {
        this.$state.combatLog.push({
          stardate: res.stardate,
          // Categoria vem do TIPO do evento. Antes era regex no texto
          // (`categoryOf`), então reescrever uma mensagem mudava a aba em que
          // ela caía — e traduzir uma quebrava a classificação inteira.
          category: TURN_EVENT_CATEGORY[evt.type],
          text: evt.text,
        })
      }
      if (this.$state.tribbleInfestationActive && !res.rejected) {
        advanceTribbleInfestation(this.$state)
      }
      // A store de apresentação filtra o que é encenável; recusa não encena
      // nada porque não produziu evento de combate.
      usePresentation().enqueue(res.events)
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

    /**
     * Movimento inter-quadrante. Sem alvo, usa `destination`.
     *
     * Engajar entra em **modo de viagem**: os turnos restantes avançam sozinhos
     * até a chegada. Não há ação possível em warp, então pedir cliques por eles
     * seria pedir cliques sem decisão.
     */
    async moveWarp(targetCoord?: GridCoord) {
      const res = await this.dispatchPlayerAction({
        type: 'move_warp',
        targetCoord: targetCoord ?? this.$state.destination ?? undefined,
      })
      if (res.warpTripStarted) usePresentation().beginTravel(res.warpTripStarted)
      return res
    },

    sendPartyTo(teamId: string, targetCoord: GridCoord) {
      return this.dispatchPlayerAction({ type: 'send_party', teamId, targetCoord })
    },

    // ── Atracagem ───────────────────────────────────────────────────────────

    /**
     * Atracar CONSOME 1 turno: manobrar ao lado de uma estação e amarrar é
     * trabalho. Largar amarra não é — `undock` segue livre. A assimetria também
     * impede que o par dock/undock vire ação gratuita ciclável.
     *
     * O turno é resolvido DEPOIS da atracagem, pra que o inimigo já encontre a
     * nave sob a proteção da base (o redirecionamento de dano pro pool depende
     * de `docked`).
     */
    async dock() {
      const res = engineDock(this.$state)
      if (!res.docked) return res
      await this.executeEndTurn()
      return res
    },

    undock() {
      engineUndock(this.$state)
    },

    /** Verificação do selo SHA-256 após reload (detecta adulteração e carrega estado). */
    async checkSaveIntegrity(raw: unknown): Promise<void> {
      // Sem payload gravado não há o que verificar. Sem esta guarda, um primeiro
      // boot cairia no `migrateSave(null, defaults)` e sobrescreveria a galáxia
      // recém-criada por OUTRA, gerada aqui só pra servir de default.
      if (raw === null || raw === undefined) return
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
     * Scan de LRS: revela o bloco 3x3 ao redor da nave e zera a idade DESSAS
     * células.
     *
     * Livre (não consome turno) — o custo do LRS é o draw passivo por turno
     * enquanto ligado.
     *
     * **Mescla, não substitui.** A versão anterior trocava `lrsScan` inteiro
     * pelo bloco novo, então escanear apagava tudo que o LRS já sabia. Dado de
     * LRS nunca se perde: só perde confiança com a idade (piso 30%). Scan e
     * sonda RENOVAM a confiança das células que tocam e deixam o resto
     * envelhecendo.
     *
     * Planeta fica de fora do KBS de propósito — é o que torna planeta
     * invisível a longa distância (world-generation decisão 8).
     */
    scanLongRange() {
      for (const q of lrsNeighborhood(this.$state.position.quadrant)) {
        const key = `${q.row},${q.col}`
        const content = this.$state.galaxy?.[key]
        if (!content) continue
        const entry = { code: liveKbsCode(content), age: 0 }
        this.$state.lrsScan[key] = entry
        this.$state.exploredQuadrants[key] = { ...entry }
      }
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

    // ── Identidade (Captain's Lounge) ────────────────────────────────────────

    /**
     * Escolhe o ícone da nave, e sugere o rótulo dela como nome — o jogador
     * segue livre pra digitar por cima (ship-identity spec, "Picking a ship
     * updates the selection").
     */
    setShipIcon(key: string, label: string) {
      this.$state.shipIconKey = key
      this.$state.shipName = label
    },

    setShipName(name: string) {
      this.$state.shipName = name
    },

    setCaptainName(name: string) {
      this.$state.captainName = name
    },
  },

  persist: {
    key: GAME_STATE_STORAGE_KEY,

    /**
     * Aqui é onde o selo de integridade passa a ser VERIFICADO.
     *
     * `checkSaveIntegrity` existia, com teste unitário verde, e nenhuma linha do
     * app a chamava: o plugin restaura o estado direto do `localStorage` sem
     * passar por ela, então um save adulterado carregava igual a um honesto e a
     * infestação de Tribbles nunca pôde disparar — por procedimento nenhum.
     *
     * O payload vem do `localStorage` **cru**, não de `store.$state`. Passar o
     * estado vivo faria o objeto hasheado compartilhar as referências aninhadas
     * (`subsystems`, `teams`, `galaxy`) com a store reativa, e uma mutação
     * durante o `await crypto.subtle.digest` mudaria o que está sendo hasheado.
     * O texto cru é imune por construção.
     *
     * `afterHydrate` e não antes: patchear antes da hidratação seria desfeito
     * pelo próprio plugin no instante seguinte.
     */
    afterHydrate: (ctx) => {
      let raw: unknown = null
      try {
        const text = globalThis.localStorage?.getItem(GAME_STATE_STORAGE_KEY)
        raw = text ? JSON.parse(text) : null
      } catch {
        // localStorage bloqueado ou JSON corrompido: sem baseline, sem
        // comparação. O próximo fim de turno regrava o selo.
        return
      }
      void (ctx.store as ReturnType<typeof useGameState>).checkSaveIntegrity(raw)
    },
  },
})
