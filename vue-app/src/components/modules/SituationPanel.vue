<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
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
    shieldStatus?: "Up" | "Down";
    warpCoreStatus?: "Nominal" | "Damaged" | "Breach";
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
    shieldStatus: "Up",
    warpCoreStatus: "Nominal",
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
  if (props.warpCoreStatus === "Breach") return "alert-bg blink";
  if (props.warpCoreStatus === "Damaged") return "golden-tanoi-bg";
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
              <LcarsBlock
                :label="shieldStatus"
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
              <LcarsBlock
                :label="warpCoreStatus"
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
          <LcarsRow v-if="warpCoreStatus === 'Breach'">
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
          <LcarsComplexButton :color="randColor()">
            <LcarsCap version="round-left" />
            <LcarsBlock
              label="ALERT"
              :color="lcarsColors.primary[2]"
              :style="{ flex: '1' }"
            />
            <LcarsText :text="redAlert ? 'RED' : 'GREEN'" />
            <LcarsBlock version="decorator" :style="{ flex: '1' }" />
            <LcarsToggleSwitch
              :color="lcarsColors.primary[3]"
              v-model="redAlert"
            />
            <LcarsCap version="round-right" :color="lcarsColors.primary[4]" />
          </LcarsComplexButton>
        </LcarsColumn>
        <LcarsColumn
          ><LcarsBlock :color="lcarsColors.primary[1]" />
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
            fontSize: '1.0rem',
            lineHeight: '1.5rem',
          }"
        />
        <LcarsCap version="round-right" size="small" :color="randColor()" />
      </LcarsRow>
    </LcarsWrapper>
  </LcarsRow>
</template>
