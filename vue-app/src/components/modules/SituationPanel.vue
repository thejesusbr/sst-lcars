<script setup lang="ts">
import { computed, ref, watch, onUnmounted, nextTick } from "vue";
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

const props = withDefaults(
  defineProps<{
    energyLevel?: number;
    stardate?: number;
    enemiesLeft?: number;
    starbasesLeft?: number;
    sectorCoords?: string;
    torpedoStock?: number;
    shieldStatus?: "UP" | "DOWN";
    warpCoreStatus?: "NOMINAL" | "DAMAGED" | "BREACH";
    overloadPercent?: number;
    breachTurnsRemaining?: number;
  }>(),
  {
    energyLevel: 3000,
    stardate: 3600.0,
    enemiesLeft: 12,
    starbasesLeft: 14,
    sectorCoords: "9876 54",
    torpedoStock: 8,
    shieldStatus: "UP",
    warpCoreStatus: "NOMINAL",
    overloadPercent: 0,
    breachTurnsRemaining: 5,
  }
);

const emit = defineEmits<{ (e: "toggle-red-alert"): void }>();

const { randColor, lcarsColors } = useLcarsColors();

const energyStatus = computed(() =>
  props.energyLevel > 1500
    ? "Nominal"
    : props.energyLevel > 500
    ? "Warning"
    : "Critical"
);
const starbasesStatus = computed(() =>
  props.starbasesLeft > 0 ? "Nominal" : "None"
);

const warpCoreColor = computed(() => {
  if (props.warpCoreStatus === "BREACH") return "alert-bg blink";
  if (props.warpCoreStatus === "DAMAGED") return "golden-tanoi-bg";
  return "caribbean-green-bg";
});

// Mesmo mecanismo do app legado (src/modules/situation-panel.js:182-187):
// so alterna a classe "red-alert" no body. O resto (botoes com randColor()
// mudando pra tons de vermelho) ja vem do CSS portado em theme.css
// (.red-alert .primary-interactive etc), sem precisar de logica extra aqui.
const redAlert = ref(false);

watch(redAlert, (value) => {
  document.body.classList.toggle("red-alert", value);
  emit("toggle-red-alert");
});

onUnmounted(() => {
  document.body.classList.remove("red-alert");
});

// Combat Log embutido na 4a coluna (antes era um CombatLog.vue a parte,
// painel fixo inferior -- fundido aqui pra caber no grid de 4 colunas).
type LogCategory = "captain" | "general" | "engineering";

interface CombatLogEntry {
  stardate: number;
  category: LogCategory;
  text: string;
}

const activeLogTab = ref<LogCategory>("general");

const toggleLogTab = (tab: LogCategory) => {
  activeLogTab.value = tab;
};

const logEntries = ref<CombatLogEntry[]>([
  {
    stardate: 3600.1,
    category: "general",
    text: "*** RED ALERT *** Klingons in this quadrant!",
  },
  {
    stardate: 3600.2,
    category: "engineering",
    text: "Shields absorb 340 units.",
  },
  {
    stardate: 3600.3,
    category: "captain",
    text: "Captain's Log: entering hostile quadrant 3,4.",
  },
  { stardate: 3600.4, category: "general", text: "*** KLINGON DESTROYED ***" },
  {
    stardate: 3600.5,
    category: "engineering",
    text: "Warp Core overload at 12%. Damage control team dispatched to warp core.",
  },
]);

const filteredLogEntries = computed(() =>
  logEntries.value.filter((entry) => entry.category === activeLogTab.value)
);

const logContent = ref<HTMLElement | null>(null);

watch(
  logEntries,
  () => {
    nextTick(() => {
      if (logContent.value) {
        logContent.value.scrollTop = logContent.value.scrollHeight;
      }
    });
  },
  { deep: true }
);
</script>

<template>
  <LcarsRow id="stn-pnl">
    <!-- Coluna esquerda: coordenadas + barra flex + cotovelo inferior -->
    <LcarsColumn
      flex="v"
      id="stn-pnl-mnu"
      :style="{ width: '7.5rem', alignSelf: 'stretch' }"
    >
      <LcarsBlock :label="sectorCoords" :color="lcarsColors.primary[4]" />
      <LcarsBlock
        flexc="v"
        :color="lcarsColors.primary[5]"
        :style="{ flex: '1' }"
      />
      <LcarsElbow
        version="horizontal"
        direction="bottom-left"
        size="medium"
        :color="lcarsColors.primary[2]"
      />
    </LcarsColumn>

    <!-- Área principal -->
    <LcarsWrapper
      id="stn-pnl-scr"
      flex="v"
      flexc="h"
      :style="{ justifyContent: 'space-between' }"
    >
      <!-- Conteúdo: dados à esquerda + Red Alert à direita -->
      <LcarsRow
        id="stn-pnl-ctn"
        flexc="v"
        :style="{
          justifyContent: 'space-evenly',
          width: '100%',
          padding: '.35rem 0',
        }"
      >
        <!-- Coluna de dados: 2 linhas × 2 itens -->
        <LcarsColumn id="tct-sit-dsp" :style="{ flex: '1' }">
          <!-- Linha 1: Energy Level + Stardate -->
          <LcarsRow>
            <LcarsComplexButton :color="randColor()" :style="{ flex: '1' }">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Energy Level"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsText
                color="text-white"
                :text="String(energyLevel)"
                :style="{ flex: '1', textAlign: 'center' }"
              />
              <LcarsBlock
                :label="energyStatus"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
            </LcarsComplexButton>

            <LcarsComplexButton :color="randColor()" :style="{ flex: '1' }">
              <LcarsCap :style="{ background: 'transparent' }" />
              <LcarsBlock
                label="Stardate"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsBlock version="decorator" />
              <LcarsText
                id="sdtIndTxt"
                color="text-white"
                :text="String(stardate)"
                :style="{ flex: '1', textAlign: 'center' }"
              />
              <LcarsBlock :style="{ flex: 'none', width: '3rem' }" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Linha 2: Enemies Left + Starbases Left -->
          <LcarsRow>
            <LcarsComplexButton :color="randColor()" :style="{ flex: '1' }">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Enemies Left"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsText
                color="text-white"
                :text="String(enemiesLeft)"
                :style="{ flex: '1', textAlign: 'center' }"
              />
              <LcarsBlock
                version="round-right"
                :style="{ flex: 'none', width: '3rem' }"
              />
            </LcarsComplexButton>

            <LcarsComplexButton :color="randColor()" :style="{ flex: '1' }">
              <LcarsCap :style="{ background: 'transparent' }" />
              <LcarsBlock
                label="Starbases Left"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsBlock version="decorator" />
              <LcarsText
                id="stb-lft-ind"
                color="text-white"
                :text="String(starbasesLeft)"
                :style="{ flex: '1', textAlign: 'center' }"
              />
              <LcarsBlock
                :label="starbasesStatus"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Linha 3: Torpedo Stock + Shield Status -->
          <LcarsRow>
            <LcarsComplexButton :color="randColor()" :style="{ flex: '1' }">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Torpedoes"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsText
                color="text-white"
                :text="String(torpedoStock)"
                :style="{ flex: '1', textAlign: 'center' }"
              />
              <LcarsBlock
                version="round-right"
                :style="{ flex: 'none', width: '3rem' }"
              />
            </LcarsComplexButton>

            <LcarsComplexButton :color="randColor()" :style="{ flex: '1' }">
              <LcarsCap :style="{ background: 'transparent' }" />
              <LcarsBlock
                label="Shields"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsBlock version="decorator" />
              <LcarsText
                color="text-white"
                :text="shieldStatus"
                :style="{ flex: '1', textAlign: 'center' }"
              />
              <LcarsBlock :style="{ flex: 'none', width: '3rem' }" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Linha 4: Warp Core Status + Overload -->
          <LcarsRow>
            <LcarsComplexButton :color="warpCoreColor" :style="{ flex: '1' }">
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="Warp Core"
                :style="{ flex: 'none', width: '6.5rem' }"
              />
              <LcarsText
                color="text-white"
                :text="warpCoreStatus"
                :style="{ flex: '1', textAlign: 'center' }"
              />
              <LcarsBlock
                version="round-right"
                :style="{ flex: 'none', width: '3rem' }"
              />
            </LcarsComplexButton>

            <LcarsComplexButton :color="randColor()" :style="{ flex: '1' }">
              <LcarsCap :style="{ background: 'transparent' }" />
              <LcarsBlock
                label="Overload"
                :style="{ flex: 'none', width: '5.5rem' }"
              />
              <LcarsBlock version="decorator" />
              <LcarsText
                color="text-white"
                :text="`${overloadPercent}%`"
                :style="{ flex: '1', textAlign: 'center' }"
              />
              <LcarsBlock :style="{ flex: 'none', width: '3rem' }" />
            </LcarsComplexButton>
          </LcarsRow>

          <!-- Alerta de Core Breach: linha condicional, largura total -->
          <LcarsRow v-if="warpCoreStatus === 'BREACH'">
            <LcarsComplexButton
              color="alert-bg"
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
        </LcarsColumn>

        <!-- Botão Toggle Red Alert -->
        <LcarsColumn>
          <LcarsRow
            :style="{ width: '100%', gap: '0.5rem', 'align-items': 'stretch' }"
          >
            <LcarsComplexButton
              :color="randColor()"
              :style="{ background: 'transparent' }"
            >
              <LcarsCap version="round-left" />
              <LcarsBlock
                label="ALERT"
                :color="lcarsColors.pool.orange[2]"
                :style="{ flex: '1' }"
              />
              <LcarsText
                color="text-white"
                :style="{ 'min-width': '7.5rem' }"
                :text="redAlert ? 'RED' : 'GREEN'"
              />
              <LcarsBlock version="decorator" :style="{ flex: '1' }" />
            </LcarsComplexButton>
            <LcarsToggleSwitch
              color="atomic-tangerine-bg"
              :style="{ flex: '1' }"
              v-model="redAlert"
            />
          </LcarsRow>
        </LcarsColumn>
        <LcarsColumn flex="v" :style="{ width: 'fit-content' }">
          <LcarsComplexButton :color="randColor()">
            <LcarsCap version="round-left" />
            <LcarsButton
              id="cap-log-tab"
              label="Cap. Log"
              :color="lcarsColors.primary[5]"
              :style="{
                filter: activeLogTab === 'captain' ? '' : 'brightness(0.6)',
              }"
              @click="toggleLogTab('captain')"
            />
            <LcarsButton
              id="shp-log-tab"
              label="Ship Log"
              :color="lcarsColors.primary[0]"
              :style="{
                filter: activeLogTab === 'general' ? '' : 'brightness(0.6)',
              }"
              @click="toggleLogTab('general')"
            />
            <LcarsButton
              id="eng-log-tab"
              label="Eng. Log"
              :color="lcarsColors.primary[1]"
              :style="{
                filter: activeLogTab === 'engineering' ? '' : 'brightness(0.6)',
              }"
              @click="toggleLogTab('engineering')"
            />
            <LcarsCap version="round-right" :color="lcarsColors.primary[4]" />
          </LcarsComplexButton>
          <div ref="logContent" class="log-content">
            <p
              v-for="(entry, i) in filteredLogEntries"
              :key="i"
              class="log-entry"
            >
              <span class="log-stardate"
                >[{{ entry.stardate.toFixed(1) }}]</span
              >
              {{ entry.text }}
            </p>
            <p
              v-if="filteredLogEntries.length === 0"
              class="log-entry log-empty"
            >
              No entries.
            </p>
          </div>
        </LcarsColumn>
      </LcarsRow>

      <!-- Footer: barras na base -->
      <LcarsRow
        id="stn-pnl-ftr"
        version="frame"
        :style="{ padding: '0 .25rem', height: '1.5rem', overflow: 'hidden' }"
      >
        <LcarsBar
          :style="{ width: '7.5rem' }"
          :color="lcarsColors.primary[5]"
        />
        <LcarsBar :style="{ width: '7.5rem' }" :color="randColor()" />
        <LcarsBar flexc="h" :color="randColor()" />
        <LcarsText
          color="text-white"
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
        <LcarsCap version="round-right" size="small" :color="randColor()" />
      </LcarsRow>
    </LcarsWrapper>
  </LcarsRow>
</template>

<style scoped>
.log-content {
  width: 0;
  min-width: 100%;
  max-height: 7.5rem;
  box-sizing: border-box;
  padding: 0.5rem 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: "LCARS-Mono", monospace;
  color: #fff;
}

.log-entry {
  overflow-wrap: break-word;
  word-break: break-word;
  margin: 0 0 0.35rem 0;
}

.log-stardate {
  color: #ff9900;
  margin-right: 0.5rem;
}

.log-empty {
  opacity: 0.5;
}
</style>
