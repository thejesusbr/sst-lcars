<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsComplexButton from "@/components/elements/LcarsComplexButton.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import EnterpriseShieldSvg, {
  type ShieldZoneKey,
} from "@/components/elements/EnterpriseShieldSvg.vue";
import SolidLevelBar from "@/components/widgets/SolidLevelBar.vue";
import DefaultBracket from "@/components/widgets/DefaultBracket.vue";

const props = withDefaults(
  defineProps<{
    initialShieldEnergy?: number;
    initialMainEnergy?: number;
    active?: boolean;
  }>(),
  {
    initialShieldEnergy: 1500,
    initialMainEnergy: 3000,
    active: false,
  }
);

// Mock local (Fase 3.5, sem estado global ainda) -- mesmas chaves de EngineeringConsole.vue
const mockIntegrity = ref<Partial<Record<ShieldZoneKey, number>>>({
  warp: 100,
  srs: 100,
  lrs: 100,
  phasers: 100,
  photons: 100,
  shields: 100,
  damage: 100,
  life: 100,
});

const { statusColor: semanticStatusColor } = useLcarsColors();

// Integridade do escudo (0-100%) -- mock local, so pro contorno do escudo.
// NAO e o mesmo que shieldEnergy (abaixo): energia afeta capacidade de
// absorcao e velocidade de regen; integridade e o resultado disso. A formula
// real fica pra Fase 4 (ver SST_LCARS_SPECS.md 4.4/12.5) -- aqui e so um
// numero mockado que o botao de teste move pra dar pra ver o gradiente.
const shieldIntegrity = ref(100);

// TacticalConsole usa v-show (o componente fica sempre montado, so escondido),
// entao onMounted nao dispara de novo ao trocar de aba -- watch no prop
// `active` pra resetar a integridade toda vez que o jogador entra no console.
// Sem regen modelada ainda, sem isso o dano acumulado ficaria preso pra
// sempre depois da 1a visita.
watch(
  () => props.active,
  (isActive) => {
    if (isActive) shieldIntegrity.value = 100;
  }
);

// Botao de teste (sem mecanica de combate ainda -- ver SST_LCARS_SPECS.md 4.4):
// simula um ataque atingindo uma zona aleatoria, flash branco na zona por um
// instante, e reduz shieldIntegrity um pouco (sem regen modelada ainda).
// Fase 4 troca isso por um gatilho real vindo do turno inimigo.
const SHIELD_ZONE_KEYS: ShieldZoneKey[] = [
  "warp",
  "srs",
  "lrs",
  "phasers",
  "photons",
  "shields",
  "damage",
  "life",
];
const hitZone = ref<ShieldZoneKey | null>(null);
let hitTimeout: ReturnType<typeof setTimeout> | undefined;

const simulateHit = () => {
  clearTimeout(hitTimeout);
  hitZone.value =
    SHIELD_ZONE_KEYS[Math.floor(Math.random() * SHIELD_ZONE_KEYS.length)];
  hitTimeout = setTimeout(() => {
    hitZone.value = null;
  }, 400);
  shieldIntegrity.value = Math.max(
    0,
    shieldIntegrity.value - (5 + Math.random() * 10)
  );
};

onUnmounted(() => clearTimeout(hitTimeout));

const shieldEnergy = ref(props.initialShieldEnergy);
const mainEnergy = ref(props.initialMainEnergy);

watch(
  () => props.initialShieldEnergy,
  (val) => {
    shieldEnergy.value = val;
  }
);
watch(
  () => props.initialMainEnergy,
  (val) => {
    mainEnergy.value = val;
  }
);

const shieldStatus = computed(() =>
  shieldEnergy.value > 0 && shieldIntegrity.value > 0 ? "UP" : "DOWN"
);
const statusColor = computed(() =>
  shieldEnergy.value > 0 ? "anakiwa-fg" : "alert-fg"
);

const mainEnergyColor = computed(() => {
  if (mainEnergy.value > 2000) return semanticStatusColor("nominal");
  if (mainEnergy.value > 800) return semanticStatusColor("damaged");
  return semanticStatusColor("critical");
});

const bracketColoring = {
  elbow: "tertiary-static",
  column1: ["primary-static", "tertiary-static", "primary-static"],
  column2: ["secondary-static", "tertiary-static", "secondary-static"],
  column3: ["primary-static", "tertiary-static", "primary-static"],
  column4: ["secondary-static", "tertiary-static", "secondary-static"],
  animated: "anakiwa-bg",
};

const transferEnergy = (amount: number) => {
  const actualTransfer = Math.min(amount, mainEnergy.value);
  const newShield = Math.min(2500, shieldEnergy.value + actualTransfer);
  const transferred = newShield - shieldEnergy.value;
  shieldEnergy.value = newShield;
  mainEnergy.value = Math.max(0, mainEnergy.value - transferred);
};

const withdrawEnergy = (amount: number) => {
  const actualWithdraw = Math.min(amount, shieldEnergy.value);
  shieldEnergy.value = Math.max(0, shieldEnergy.value - actualWithdraw);
  mainEnergy.value = Math.min(4500, mainEnergy.value + actualWithdraw);
};

const setShieldTo = (target: number) => {
  const current = shieldEnergy.value;
  if (target > current) {
    transferEnergy(target - current);
  } else {
    withdrawEnergy(current - target);
  }
};

const lowerShields = () => {
  mainEnergy.value = Math.min(4500, mainEnergy.value + shieldEnergy.value);
  shieldEnergy.value = 0;
};

const raiseShields = () => {
  const needed = 2500 - shieldEnergy.value;
  const actual = Math.min(needed, mainEnergy.value);
  shieldEnergy.value = Math.min(2500, shieldEnergy.value + actual);
  mainEnergy.value = Math.max(0, mainEnergy.value - actual);
};
</script>

<template>
  <LcarsRow
    id="shdCnsDsp"
    flexc="h"
    :style="{ justifyContent: 'space-evenly', gap: '2rem', width: '100%' }"
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
      <LcarsComplexButton color="primary-interactive" :style="{ width: '100%' }">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Shields Status" :style="{ width: '8.5rem' }" />
        <LcarsBlock color="secondary-interactive" :style="{ width: '2rem' }" />
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

      <DefaultBracket
        :coloring="bracketColoring"
        :style="{ marginTop: '1rem', width: '100%', minHeight: '22rem' }"
      >
        <EnterpriseShieldSvg
          :shield-integrity="shieldIntegrity"
          :shield-active="shieldEnergy > 0"
          :system-integrity="mockIntegrity"
          :hit-zone="hitZone"
        />
      </DefaultBracket>

      <LcarsButton
        label="Simulate Hit"
        color="alert-bg"
        :style="{ width: '100%', marginTop: '0.75rem' }"
        @click="simulateHit"
      />
    </LcarsColumn>

    <!-- Column 2: Shield Control -->
    <LcarsColumn flex="v" :style="{ flex: '1', maxWidth: '35rem' }">
      <LcarsTitle
        version="centered"
        size="small"
        text="Shield Energy Transfer"
        :style="{ marginBottom: '1rem' }"
      />

      <LcarsComplexButton color="tertiary-interactive" :style="{ width: '100%' }">
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
          color="alert-bg"
          :style="{ flex: '1' }"
          @click="lowerShields"
        />
        <LcarsButton
          label="Raise Shields"
          color="bg-green-3"
          :style="{ flex: '1' }"
          @click="raiseShields"
        />
      </LcarsRow>

      <LcarsComplexButton
        color="highlight-dark-interactive"
        :style="{ width: '100%', marginTop: '1rem' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Main Energy" :style="{ width: '9rem' }" />
        <SolidLevelBar
          version="horizontal"
          :max="4500"
          :min="0"
          :color="mainEnergyColor"
          :level="mainEnergy"
          :label="mainEnergy.toString()"
          :style="{ flex: '1' }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
    </LcarsColumn>
  </LcarsRow>
</template>
