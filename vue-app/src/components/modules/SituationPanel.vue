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
import CombatLog, {
  type CombatLogEntry,
} from "@/components/widgets/CombatLog.vue";
import { Sound, useSound } from "@/composables/useSound";

const { playSound } = useSound();

const props = withDefaults(
  defineProps<{
    energyLevel?: number;
    stardate?: number;
    enemiesLeft?: number;
    starbasesLeft?: number;
    sectorCoords?: string;
    torpedoStock?: number;
    shieldStatus?: "UP" | "DOWN";
    warpCoreStatus?: "NOM" | "DAM" | "BRC";
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
    warpCoreStatus: "NOM",
    overloadPercent: 0,
    breachTurnsRemaining: 5,
  }
);

const emit = defineEmits<{ (e: "toggle-red-alert"): void }>();

const { lcarsColors, statusColor } = useLcarsColors();

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
  if (props.warpCoreStatus === "BRC") return `${statusColor("critical")} blink`;
  if (props.warpCoreStatus === "DAM") return statusColor("damaged");
  return statusColor("nominal");
});

// Mesmo mecanismo do app legado (src/modules/situation-panel.js:182-187):
// so alterna a classe "red-alert" no body. O resto (botoes com cor fixa de
// papel de tema mudando pra tons de vermelho) ja vem do CSS portado em
// theme.css (.red-alert .primary-interactive etc), sem precisar de logica
// extra aqui.
const redAlert = ref(false);

watch(redAlert, (value) => {
  document.body.classList.toggle("red-alert", value);
  if (value) playSound(Sound.RED_ALERT);
  emit("toggle-red-alert");
});

onUnmounted(() => {
  document.body.classList.remove("red-alert");
});

// Combat Log embutido na 4a coluna (painel fixo inferior antes -- fundido
// aqui pra caber no grid de 4 colunas). Exibicao/scroll ficam no componente
// CombatLog.vue; aqui so os dados e o filtro por aba.
const activeLogTab = ref<CombatLogEntry["category"]>("general");

const toggleLogTab = (tab: CombatLogEntry["category"]) => {
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
        <!-- Botão Toggle Red Alert -->
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
                :text="redAlert ? 'RED' : 'GREEN'"
              />
            </LcarsComplexButton>
            <LcarsToggleSwitch
              color="highlight-dark-interactive"
              :style="{ flex: '1' }"
              v-model="redAlert"
            />
            <LcarsCap version="round-right" color="tertiary-static" />
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
              :style="{
                filter: activeLogTab === 'captain' ? '' : 'brightness(0.6)',
              }"
              @click="toggleLogTab('captain')"
            />
            <LcarsButton
              id="shp-log-tab"
              label="Ship Log"
              color="secondary-static"
              :style="{
                filter: activeLogTab === 'general' ? '' : 'brightness(0.6)',
              }"
              @click="toggleLogTab('general')"
            />
            <LcarsButton
              id="eng-log-tab"
              label="Eng. Log"
              color="tertiary-static"
              :style="{
                filter: activeLogTab === 'engineering' ? '' : 'brightness(0.6)',
              }"
              @click="toggleLogTab('engineering')"
            />
            <LcarsCap version="round-right" :color="lcarsColors.primary[4]" />
          </LcarsComplexButton>
          <CombatLog :entries="filteredLogEntries" />
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
