<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
import LcarsButton from "../elements/LcarsButton.vue";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";
import LcarsBar from "@/components/elements/LcarsBar.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsElbow from "@/components/elements/LcarsElbow.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsComplexButton from "@/components/elements/LcarsComplexButton.vue";
import LcarsWrapper from "@/components/elements/LcarsWrapper.vue";
import LcarsToggleSwitch from "../elements/LcarsToggleSwitch.vue";
import CombatLog from "@/components/widgets/CombatLog.vue";
import { Sound, useSound } from "@/composables/useSound";
import { useGameState } from "@/stores/useGameState";
import { OVERLOAD_MAX } from "@/engine/constants";
import type { CombatLogEntry } from "@/types/game";

const { playSound } = useSound();
const gameState = useGameState();

const { lcarsColors, statusColor } = useLcarsColors();

// ── Leitura do estado real ───────────────────────────────────────────────────

// ORÇAMENTO: gerada − consumida. Sobra positiva = dentro do orçamento; negativa
// = consumo passou do output do WC, que é o gatilho do `autoOverload`.
// Antes lia `mainEnergy`, que é um estoque separado e nunca é descontado pelo
// consumo por turno — ficava travado em 3000 numa partida tranquila.
const energyLevel = computed(() => Math.round(gameState.energyBudget));
const stardate = computed(() => gameState.stardate.toFixed(1));
const enemiesLeft = computed(() => gameState.enemiesLeft);
const starbasesLeft = computed(() => gameState.starbasesLeft);
const torpedoStock = computed(() => gameState.torpedoStock);

const sectorCoords = computed(() => {
  const q = gameState.position.quadrant;
  const s = gameState.position.sector;
  return `${q.row}${q.col} ${s.row}${s.col}`;
});

const shieldStatus = computed(() =>
  gameState.shieldEnergy > 0 && gameState.shieldIntegrity > 0 ? "UP" : "DOWN"
);

const warpCoreStatus = computed<"NOM" | "DAM" | "BRC">(() => {
  if (gameState.breach.active) return "BRC";
  return gameState.subsystems.warpCore < 100 ? "DAM" : "NOM";
});

const breachTurnsRemaining = computed(() => gameState.breach.turnsRemaining);

// Casco: o que o dano inimigo consome depois que os escudos saturam. Zerar é
// destruição da nave.
const hullIntegrity = computed(() => Math.round(gameState.hullIntegrity));
const hullColor = computed(() => {
  if (hullIntegrity.value > 60) return statusColor("nominal");
  if (hullIntegrity.value > 25) return statusColor("damaged");
  return `${statusColor("critical")} blink`;
});

// Overload efetivo em % da escala 0-20, incluindo o automático do consumo real.
const overloadPercent = computed(() =>
  Math.round((gameState.manualOverload / OVERLOAD_MAX) * 100)
);

const prisoners = computed(
  () => `${gameState.brig.count}/${gameState.brig.capacity}`
);

// Limiares em cima do ORÇAMENTO, não do estoque: sobra alta é folga, sobra
// negativa é sobrecarga automática em curso.
const energyStatus = computed(() =>
  energyLevel.value > 1500
    ? "Nominal"
    : energyLevel.value > 0
    ? "Warning"
    : "Overload"
);
const starbasesStatus = computed(() =>
  starbasesLeft.value > 0 ? "Nominal" : "None"
);

const warpCoreColor = computed(() => {
  if (warpCoreStatus.value === "BRC") return `${statusColor("critical")} blink`;
  if (warpCoreStatus.value === "DAM") return statusColor("damaged");
  return statusColor("nominal");
});

// ── Alerta: bidirecional ─────────────────────────────────────────────────────

// O toggle escreve no estado e o estado dirige a classe do body — não um `ref`
// local. Bidirecional de verdade: o engine também pode subir o nível (entrar em
// quadrante hostil) e o painel reflete sem o jogador tocar em nada.
const redAlert = computed({
  get: () => gameState.alertLevel === "red",
  set: (value) => gameState.setAlertLevel(value ? "red" : "green"),
});

// Texto mostra o NÍVEL, não um booleano: `yellow` é estado válido desde já,
// só não tem tema próprio (design.md decisão 7).
const alertLabel = computed(() => gameState.alertLevel.toUpperCase());

watch(
  () => gameState.alertLevel,
  (level) => {
    // A camada de tema é binária por construção: só `red` tem tratamento.
    document.body.classList.toggle("red-alert", level === "red");
    if (level === "red") playSound(Sound.RED_ALERT);
  },
  { immediate: true }
);

onUnmounted(() => {
  document.body.classList.remove("red-alert");
});

// ── Controles de turno ───────────────────────────────────────────────────────

const busy = ref(false);

const endTurn = async () => {
  if (busy.value) return;
  busy.value = true;
  try {
    await gameState.executeEndTurn();
  } finally {
    busy.value = false;
  }
};

const SKIP_TURNS = 5;

const skipTurns = async () => {
  if (busy.value) return;
  busy.value = true;
  try {
    await gameState.executeSkipTurns(SKIP_TURNS);
  } finally {
    busy.value = false;
  }
};

// ── Combat Log ───────────────────────────────────────────────────────────────

const activeLogTab = ref<CombatLogEntry["category"]>("general");

// Trocar de aba NÃO marca como lida: só rolar até o fim marca (decisão #27).
const toggleLogTab = (tab: CombatLogEntry["category"]) => {
  activeLogTab.value = tab;
};

const filteredLogEntries = computed(() =>
  gameState.combatLog.filter((entry) => entry.category === activeLogTab.value)
);

/** Aba pisca enquanto a categoria tiver entrada acima do marcador de leitura. */
const tabClass = (tab: CombatLogEntry["category"]) =>
  gameState.unreadByCategory[tab] > 0 ? "blink" : "";

// Primeira não lida da aba ativa = o próprio marcador de leitura (é uma
// contagem de lidas, logo o índice da próxima). O CombatLog rola até ela ao
// trocar de aba; a aba para de piscar quando o scroll atingir o fim
// (`reached-end` -> `markLogRead`).
const firstUnreadIndex = computed(
  () => gameState.logReadMarkers[activeLogTab.value]
);

const tabDim = (tab: CombatLogEntry["category"]) =>
  activeLogTab.value === tab ? "" : "brightness(0.6)";
</script>

<template>
  <LcarsRow id="stn-pnl">
    <!-- Coluna esquerda: coordenadas + barra flex + cotovelo inferior -->
    <LcarsColumn
      flex="v"
      id="stn-pnl-mnu"
      :style="{ width: '7.5rem', alignSelf: 'stretch' }"
    >
      <LcarsBlock :label="sectorCoords" color="primary-static" />
      <LcarsBlock flexc="v" color="secondary-static" :style="{ flex: '1' }" />
      <LcarsElbow
        version="horizontal"
        direction="bottom-left"
        size="medium"
        color="tertiary-static"
      />
    </LcarsColumn>

    <!-- Área principal -->
    <LcarsWrapper
      id="stn-pnl-scr"
      flex="v"
      flexc="h"
      :style="{ justifyContent: 'space-evenly' }"
    >
      <!-- Conteúdo: dados à esquerda + Red Alert à direita -->
      <LcarsRow
        id="stn-pnl-ctn"
        flex="h"
        flexc="v"
        :style="{
          justifyContent: 'space-evenly',
          width: '100%',
          padding: '.35rem 0',
        }"
      >
        <!-- Coluna de dados A: Energy, Enemies, Torpedoes, Warp Core -->
        <LcarsColumn id="stn-pnl-dsp-a" :style="{ flex: '1' }">
          <!-- Energy level indicator -->
          <LcarsRow>
            <LcarsComplexButton color="primary-interactive">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Energy Level"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsText
                color="text-light"
                :text="String(energyLevel)"
                :style="{ flex: '1' }"
              />
              <LcarsBlock
                color="tertiary-static"
                :label="energyStatus"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsCap version="round-right" color="tertiary-static" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Enemies Left -->
          <LcarsRow>
            <LcarsComplexButton color="tertiary-interactive">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Enemies Left"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsText
                color="text-dark"
                :text="String(enemiesLeft)"
                :style="{ flex: '1' }"
              />
              <LcarsBlock
                version="round-right"
                color="secondary-static"
                :style="{ flex: 'none', width: '3rem' }"
              />
              <LcarsCap version="round-right" color="secondary-static" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Torpedo Stock -->
          <LcarsRow>
            <LcarsComplexButton color="highlight-interactive">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Torpedoes"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsText
                color="text-highlight"
                :text="String(torpedoStock)"
                :style="{ flex: '1' }"
              />
              <LcarsBlock
                version="round-right"
                :style="{ flex: 'none', width: '3rem' }"
              />
              <LcarsCap :style="{ background: 'transparent' }" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Warp Core Status -->
          <LcarsRow>
            <LcarsComplexButton color="tertiary-static">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Warp Core"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsText
                color="text-light"
                :text="warpCoreStatus"
                :style="{ flex: '1' }"
              />
              <LcarsBlock
                version="round-right"
                :color="warpCoreColor"
                :style="{ flex: 'none', width: '3rem' }"
              />
              <LcarsCap :style="{ background: 'transparent' }" />
            </LcarsComplexButton>
          </LcarsRow>
        </LcarsColumn>
        <!-- Coluna de dados B: Stardate, Starbases, Shields, Overload -->
        <LcarsColumn id="stn-pnl-dsp-b" :style="{ flex: '1' }">
          <!-- Stardate indicator-->
          <LcarsRow>
            <LcarsComplexButton color="secondary-interactive">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Stardate"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsText
                id="sdtIndTxt"
                color="text-light"
                :text="String(stardate)"
                :style="{ flex: '1' }"
              />
              <LcarsBlock version="decorator" color="primary-interactive" />
              <LcarsBlock :style="{ flex: 'none', width: '3rem' }" />
              <LcarsCap version="round-right" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Starbases Left -->
          <LcarsRow>
            <LcarsComplexButton color="highlight-interactive">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Starbases Left"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsBlock version="decorator" />
              <LcarsText
                id="stb-lft-ind"
                color="text-light"
                :text="String(starbasesLeft)"
                :style="{ flex: '1' }"
              />
              <LcarsBlock
                :label="starbasesStatus"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Shield status -->
          <LcarsRow>
            <LcarsComplexButton color="primary-interactive">
              <LcarsCap :style="{ background: 'transparent' }" />
              <LcarsBlock
                label="Shields"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsBlock version="decorator" />
              <LcarsText
                color="text-light"
                :text="shieldStatus"
                :style="{ flex: '1' }"
              />
              <LcarsBlock :style="{ flex: 'none', width: '3rem' }" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Hull integrity -->
          <LcarsRow>
            <LcarsComplexButton color="primary-interactive">
              <LcarsCap :style="{ background: 'transparent' }" />
              <LcarsBlock
                label="Hull"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsBlock version="decorator" />
              <LcarsText
                color="text-light"
                :text="`${hullIntegrity}%`"
                :style="{ flex: '1' }"
              />
              <LcarsBlock
                :color="hullColor"
                :style="{ flex: 'none', width: '3rem' }"
              />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Overload -->
          <LcarsRow>
            <LcarsComplexButton color="secondary-interactive">
              <LcarsCap :style="{ background: 'transparent' }" />
              <LcarsBlock
                label="Overload"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsBlock version="decorator" />
              <LcarsText
                color="text-light"
                :text="`${overloadPercent}%`"
                :style="{ flex: '1' }"
              />
              <LcarsBlock :style="{ flex: 'none', width: '3rem' }" />
              <LcarsCap version="round-right" />
            </LcarsComplexButton>
          </LcarsRow>
        </LcarsColumn>
        <!-- Botão Toggle Red Alert, Brig, Avanço de turno -->
        <LcarsColumn id="stn-pnl-dsp-c" :style="{ flex: '1' }">
          <LcarsRow
            :style="{ width: '100%', gap: '0.5rem', 'align-items': 'stretch' }"
          >
            <LcarsComplexButton
              color="tertiary-interactive"
              :style="{ background: 'transparent' }"
            >
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="ALERT CONDITION"
                color="highlight-interactive"
                :style="{ flex: '1' }"
              />
              <LcarsText
                color="text-light"
                :style="{ 'min-width': '7.5rem' }"
                :text="alertLabel"
              />
            </LcarsComplexButton>
            <LcarsToggleSwitch
              color="highlight-interactive"
              :style="{ flex: '1' }"
              v-model="redAlert"
            />
            <LcarsCap version="round-right" color="tertiary-static" />
          </LcarsRow>

          <!-- Prisioneiros na cela: count/capacity -->
          <LcarsRow>
            <LcarsComplexButton color="secondary-interactive">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Prisoners"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsText
                color="text-light"
                :text="prisoners"
                :style="{ flex: '1' }"
              />
              <LcarsCap version="round-right" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Avanço de turno -->
          <LcarsRow :style="{ gap: '0.35rem' }">
            <LcarsButton
              id="end-turn-btn"
              label="End Turn"
              color="primary-interactive"
              :disabled="busy"
              :style="{ flex: '1' }"
              @click="endTurn"
            />
            <LcarsButton
              id="skip-turns-btn"
              :label="`Skip ${SKIP_TURNS}`"
              color="tertiary-interactive"
              :disabled="busy"
              :style="{ flex: '1' }"
              @click="skipTurns"
            />
          </LcarsRow>
        </LcarsColumn>
        <!-- Logs -->
        <LcarsColumn
          id="stn-pnl-dsp-d"
          flex="v"
          :style="{ flex: '1', width: 'fit-content' }"
        >
          <LcarsComplexButton color="highlight-interactive">
            <LcarsCap version="round-left" />
            <LcarsButton
              id="cap-log-tab"
              label="Cap. Log"
              color="primary-static"
              :class="tabClass('captain')"
              :style="{ filter: tabDim('captain') }"
              @click="toggleLogTab('captain')"
            />
            <LcarsButton
              id="shp-log-tab"
              label="Ship Log"
              color="secondary-static"
              :class="tabClass('general')"
              :style="{ filter: tabDim('general') }"
              @click="toggleLogTab('general')"
            />
            <LcarsButton
              id="eng-log-tab"
              label="Eng. Log"
              color="tertiary-static"
              :class="tabClass('engineering')"
              :style="{ filter: tabDim('engineering') }"
              @click="toggleLogTab('engineering')"
            />
            <LcarsCap version="round-right" :color="lcarsColors.primary[4]" />
          </LcarsComplexButton>
          <CombatLog
            :entries="filteredLogEntries"
            :first-unread-index="firstUnreadIndex"
            @reached-end="gameState.markLogRead(activeLogTab)"
          />
        </LcarsColumn>
      </LcarsRow>

      <!-- Alerta de Core Breach: linha condicional, largura total -->
      <LcarsRow
        v-if="warpCoreStatus === 'BRC'"
        :style="{ padding: '0 .35rem' }"
      >
        <LcarsComplexButton
          :color="statusColor('critical')"
          class="blink"
          :style="{ flex: '1' }"
        >
          <LcarsCap version="round-left" />
          <LcarsBlock
            :label="`RADIATION BREACH — ${breachTurnsRemaining} TURNS REMAINING`"
            :style="{ flex: '1', textAlign: 'center', fontWeight: 'bold' }"
          />
          <LcarsCap version="round-right" />
        </LcarsComplexButton>
      </LcarsRow>

      <!-- Footer: barras na base -->
      <LcarsRow
        id="stn-pnl-ftr"
        version="frame"
        :style="{ padding: '0 .25rem', height: '1.5rem', overflow: 'hidden' }"
      >
        <LcarsBar :style="{ width: '7.5rem' }" color="tertiary-static" />
        <LcarsBar version="small" color="secondary-static" />
        <LcarsBar version="medium" color="tertiary-static" />
        <LcarsBar version="large" color="highlight-interactive" />
        <LcarsBar version="xxlarge" color="tertiary-static" />
        <LcarsBar flexc="h" color="primary-interactive" />
        <LcarsBar version="medium" color="primary-static" />
        <LcarsText
          color="text-light"
          text="SITUATION PANEL"
          :style="{
            whiteSpace: 'nowrap',
            padding: '0 0.5rem',
            display: 'flex',
            alignItems: 'center',
            fontSize: '1.5rem',
            lineHeight: '1.5rem',
          }"
        />
        <LcarsCap
          version="round-right"
          size="small"
          color="secondary-interactive"
        />
      </LcarsRow>
    </LcarsWrapper>
  </LcarsRow>
</template>
