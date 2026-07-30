<script setup lang="ts">
import { computed } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
import { useGameState } from "@/stores/useGameState";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsComplexButton from "@/components/elements/LcarsComplexButton.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import EnterpriseShieldSvg from "@/components/elements/EnterpriseShieldSvg.vue";
import SolidLevelBar from "@/components/widgets/SolidLevelBar.vue";
import DefaultBracket from "@/components/widgets/DefaultBracket.vue";

withDefaults(
  defineProps<{
    active?: boolean;
  }>(),
  {
    active: false,
  }
);

const gameState = useGameState();
const { statusColor: semanticStatusColor } = useLcarsColors();

const shieldEnergy = computed(() => gameState.shieldEnergy);
const shieldIntegrity = computed(() => gameState.shieldIntegrity);
const subsystems = computed(() => gameState.subsystems);

const shieldStatus = computed(() =>
  shieldEnergy.value > 0 && shieldIntegrity.value > 0 ? "UP" : "DOWN"
);

// ── Casco ────────────────────────────────────────────────────────────────────

// Estrutural, distinto de `shieldIntegrity`: e o que o dano inimigo consome
// DEPOIS que os escudos saturam, e nao regenera sozinho -- so em drydock.
// Zerar destroi a nave (`hull_destroyed`).
const hullIntegrity = computed(() => Math.round(gameState.hullIntegrity));
const hullCritical = computed(() => hullIntegrity.value <= 25);
const hullColor = computed(() =>
  semanticStatusColor(
    hullIntegrity.value > 60
      ? "nominal"
      : hullIntegrity.value > 25
      ? "damaged"
      : "critical"
  )
);
const hullTextColor = computed(() =>
  semanticStatusColor(
    hullIntegrity.value > 60
      ? "nominal"
      : hullIntegrity.value > 25
      ? "damaged"
      : "critical",
    "fg"
  )
);
const statusColor = computed(() =>
  semanticStatusColor(shieldEnergy.value > 0 ? "nominal" : "critical", "fg")
);

const bracketColoring = {
  elbow: "tertiary-static",
  column1: ["primary-static", "tertiary-static", "primary-static"],
  column2: ["secondary-static", "tertiary-static", "secondary-static"],
  column3: ["primary-static", "tertiary-static", "primary-static"],
  column4: ["secondary-static", "tertiary-static", "secondary-static"],
  animated: "anakiwa-bg",
};

const transferEnergy = (amount: number) => {
  gameState.transferToShields(amount);
};

const withdrawEnergy = (amount: number) => {
  gameState.transferFromShields(amount);
};

const setShieldTo = (target: number) => {
  gameState.setShieldEnergyTo(target);
};

const lowerShields = () => {
  gameState.lowerShields();
};

const raiseShields = () => {
  gameState.raiseShields();
};
</script>

<template>
  <LcarsRow
    id="shdCnsDsp"
    flexc="h"
    :style="{
      'padding-top': '1.25rem',
      justifyContent: 'space-evenly',
      width: '100%',
    }"
  >
    <!-- Column 1: Shield Status Viewer -->
    <LcarsColumn
      flex="v"
      :style="{
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '34rem',
      }"
    >
      <!-- Título -->
      <LcarsTitle version="centered" size="small" text="Shield Status" />
      <!-- Indicador de status (UP/DOWN) do escudo -->
      <LcarsComplexButton
        color="primary-interactive"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock
          label="Shields Status"
          :style="{ flex: '1' }"
          :color="shieldStatus === 'DOWN' ? 'alert-bg' : 'primary-static'"
          :class="{ blink: shieldStatus === 'DOWN' }"
        />
        <LcarsText
          id="shdStsIndTxt"
          :text="shieldStatus"
          :color="statusColor"
          :class="{ blink: shieldStatus === 'DOWN' }"
          :style="{
            flex: '1',
            minWidth: '7.5rem',
            textAlign: 'center',
            fontWeight: 'bold',
            padding: '0 0.5rem',
          }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Diagrama do escudo (zonas + integridade), dentro do bracket padrão -->
      <DefaultBracket
        :coloring="bracketColoring"
        :style="{ marginTop: '1rem', width: '100%', minHeight: '22rem' }"
      >
        <EnterpriseShieldSvg
          :shield-integrity="shieldIntegrity"
          :shield-active="shieldEnergy > 0"
          :system-integrity="subsystems"
        />
      </DefaultBracket>

      <!-- Casco: o que sobra quando o escudo satura. Fica logo abaixo do
           diagrama porque a leitura util e a PAR -- escudo alto com casco
           baixo e uma situacao completamente diferente de escudo baixo com
           casco intacto, e separar os dois esconde isso. -->
      <LcarsComplexButton
        color="primary-interactive"
        :style="{ width: '100%', marginTop: '0.5rem' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock
          label="Hull Integrity"
          :style="{ flex: 'none', width: '9rem' }"
          :color="hullCritical ? 'alert-bg' : 'primary-static'"
          :class="{ blink: hullCritical }"
        />
        <SolidLevelBar
          version="horizontal"
          :max="100"
          :min="0"
          :level="hullIntegrity"
          :color="hullColor"
          :style="{ flex: '1' }"
        />
        <LcarsText
          :text="`${hullIntegrity}%`"
          :color="hullTextColor"
          :class="{ blink: hullCritical }"
          :style="{
            flex: 'none',
            minWidth: '4.5rem',
            textAlign: 'center',
            fontWeight: 'bold',
          }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
    </LcarsColumn>

    <!-- Column 2: Shield Control -->
    <LcarsColumn flex="v" :style="{ flex: '1', maxWidth: '35rem' }">
      <LcarsTitle
        version="centered"
        size="small"
        text="Shield Energy Transfer"
        :style="{ marginBottom: '1rem' }"
      />

      <!-- Barra de nível: energia atual do escudo -->
      <LcarsComplexButton
        color="tertiary-interactive"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Shield Energy" :style="{ width: '9rem' }" />
        <SolidLevelBar
          id="shd-eng-lvl-bar"
          version="horizontal"
          :max="2500"
          :min="0"
          color="anakiwa-bg"
          :level="shieldEnergy"
          :label="shieldEnergy.toString()"
          :style="{ flex: '1' }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <LcarsTitle
        version="centered"
        size="small"
        text="Transfer Energy"
        :style="{ margin: '1.25rem 0 0.5rem' }"
      />

      <!-- Presets de transferência: -/definir/+ por quantidade fixa -->
      <LcarsColumn flex="v" :style="{ gap: '0.5rem', width: '100%' }">
        <LcarsComplexButton
          v-for="preset in [250, 500, 1000]"
          :key="preset"
          color="highlight-interactive"
          :style="{ width: '100%' }"
        >
          <LcarsButton
            version="round-left"
            label="-"
            @click="withdrawEnergy(preset)"
          />
          <LcarsButton
            version="round"
            label="Set to"
            @click="setShieldTo(preset)"
            :style="{ flex: '0 0 auto' }"
          />
          <LcarsText
            :text="preset.toString()"
            :style="{ flex: '1', textAlign: 'center', fontWeight: 'bold' }"
          />
          <LcarsButton
            version="round-right"
            label="+"
            @click="transferEnergy(preset)"
          />
        </LcarsComplexButton>
      </LcarsColumn>

      <!-- Ações totais: baixar/levantar escudos por completo -->
      <LcarsRow
        :style="{
          marginTop: '1rem',
          gap: '0.75rem',
          width: '100%',
          justifyContent: 'center',
        }"
      >
        <LcarsButton
          label="Lower Shields"
          version="round"
          :color="semanticStatusColor('critical')"
          :style="{ flex: '1' }"
          @click="lowerShields"
        />
        <LcarsButton
          label="Raise Shields"
          version="round"
          color="bg-green-3"
          :style="{ flex: '1' }"
          @click="raiseShields"
        />
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>
