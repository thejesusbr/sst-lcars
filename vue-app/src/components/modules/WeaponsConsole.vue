<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
import { useScannerIcons, ScannerEntity } from "@/composables/useScannerIcons";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import LcarsComplexButton from "@/components/elements/LcarsComplexButton.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsScanner from "@/components/elements/LcarsScanner.vue";
import LcarsToggleSwitch from "@/components/elements/LcarsToggleSwitch.vue";
import DefaultBracket from "@/components/widgets/DefaultBracket.vue";
import SolidLevelBar from "@/components/widgets/SolidLevelBar.vue";

const props = withDefaults(
  defineProps<{
    initialStock?: number;
    initialPhaserTemp?: number;
    initialTargets?: number;
  }>(),
  {
    initialStock: 8,
    initialPhaserTemp: 50,
    initialTargets: 3,
  }
);

const { statusColor } = useLcarsColors();
const { getIcon } = useScannerIcons();

interface Tube {
  targetIndex: number;
  status: "Empty" | "Loaded";
  autoLoad: boolean;
}

const phaserTemp = ref(props.initialPhaserTemp);
const PHASER_POWER_MAX = 3000;
const phaserPower = ref(1500);
const phaserPowerPresets = [25, 50, 75, 100].map((percent) => ({
  label: `${percent}%`,
  value: Math.round((percent / 100) * PHASER_POWER_MAX),
}));
const lockedTargets = ref(props.initialTargets);
const torpedoStock = ref(props.initialStock);

// Alvos disponiveis no setor (mock local -- vira parte do estado real dos
// Klingons na Fase 4). Independente dos tubos: o computador de mira cicla
// entre esses alvos, o capitao decide livremente como distribuir os tubos
// entre eles (todos num alvo, um em cada, 2:1 etc), ver SST_LCARS_SPECS.md 12.6.
const enemyTargets = ref([
  { x: 3, y: 2 },
  { x: 6, y: 7 },
  { x: 2, y: 5 },
]);

const tubes = ref<Tube[]>([
  { targetIndex: 0, status: "Empty", autoLoad: false },
  { targetIndex: 1, status: "Empty", autoLoad: false },
  { targetIndex: 2, status: "Empty", autoLoad: false },
]);

const targetOf = (tube: Tube) => enemyTargets.value[tube.targetIndex];

watch(
  () => props.initialPhaserTemp,
  (val) => {
    phaserTemp.value = val;
  }
);
watch(
  () => props.initialStock,
  (val) => {
    torpedoStock.value = val;
  }
);
watch(
  () => props.initialTargets,
  (val) => {
    lockedTargets.value = val;
  }
);

const phaserEffectiveness = computed(() =>
  Math.max(0, 100 - phaserTemp.value / 2.7)
);

const phaserTempColor = computed(() => {
  if (phaserTemp.value < 100) return statusColor("nominal");
  if (phaserTemp.value < 200) return statusColor("damaged");
  return statusColor("critical");
});

const torpedoStockColor = computed(() => {
  if (torpedoStock.value > 4) return statusColor("nominal");
  if (torpedoStock.value > 0) return statusColor("damaged");
  return statusColor("critical");
});

const scannerGrid = computed(() => {
  const grid: Record<string, { img?: string; text?: string }> = {
    "4,4": { img: getIcon(ScannerEntity.PLAYER) },
  };
  enemyTargets.value.forEach((target, targetIndex) => {
    const key = `${target.y},${target.x}`;
    if (key === "4,4") return;
    const assignedTubes = tubes.value
      .map((tube, i) => (tube.targetIndex === targetIndex ? i + 1 : null))
      .filter((n): n is number => n !== null);
    grid[key] = {
      img: getIcon(ScannerEntity.KLINGON_CRUISER),
      text: assignedTubes.length ? assignedTubes.join(",") : undefined,
    };
  });
  return grid;
});

const bracketColoring = {
  elbow: "bg-green-4",
  column1: ["bg-blue-1", "bg-green-2", "bg-blue-1"],
  column2: ["bg-blue-3", "bg-green-4", "bg-blue-3"],
  column3: ["bg-blue-1", "bg-green-2", "bg-blue-1"],
  column4: ["bg-blue-3", "bg-green-4", "bg-blue-3"],
  animated: "bg-red-1",
};

const firePhasers = () => {
  phaserTemp.value = Math.min(270, phaserTemp.value + 30);
};

const lockTargets = () => {
  lockedTargets.value = Math.max(0, lockedTargets.value);
};

const cycleTubeTarget = (index: number) => {
  const tube = tubes.value[index];
  tube.targetIndex = (tube.targetIndex + 1) % enemyTargets.value.length;
};

const loadTube = (index: number) => {
  if (torpedoStock.value > 0 && tubes.value[index].status === "Empty") {
    torpedoStock.value -= 1;
    tubes.value[index].status = "Loaded";
  }
};

const unloadTube = (index: number) => {
  const tube = tubes.value[index];
  if (tube.status === "Loaded") {
    torpedoStock.value += 1;
    tube.status = "Empty";
    tube.autoLoad = false;
  }
};

const toggleTubeLoad = (index: number) => {
  if (tubes.value[index].status === "Loaded") {
    unloadTube(index);
  } else {
    loadTube(index);
  }
};

const toggleAutoLoad = (index: number) => {
  tubes.value[index].autoLoad = !tubes.value[index].autoLoad;
};

const fireTorpedoes = () => {
  const hasLoaded = tubes.value.some((t) => t.status === "Loaded");
  if (hasLoaded) {
    tubes.value.forEach((tube) => {
      if (tube.status === "Loaded") {
        tube.status = "Empty";
        if (tube.autoLoad && torpedoStock.value > 0) {
          torpedoStock.value -= 1;
          tube.status = "Loaded";
        }
      }
    });
    lockedTargets.value = Math.max(0, lockedTargets.value - 1);
    phaserTemp.value = Math.min(270, phaserTemp.value + 30);
  }
};
</script>

<template>
  <LcarsRow
    id="wpnCnsDsp"
    flexc="h"
    :style="{
      'padding-top': '1.25rem',
      'justify-content': 'space-evenly',
      gap: '2rem',
      width: '100%',
    }"
  >
    <!-- Column 1: Phaser Bank Control -->
    <LcarsColumn
      flex="v"
      :style="{
        'justify-content': 'flex-start',
        'align-items': 'center',
        minWidth: '30rem',
      }"
    >
      <LcarsTitle
        version="centered"
        size="small"
        text="Phaser Bank Control"
        color="text-white"
      />

      <!-- Temperature -->
      <LcarsComplexButton
        color="primary-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Temperature" :style="{ width: '8.5rem' }" />
        <SolidLevelBar
          version="horizontal"
          :max="270"
          :min="0"
          :color="phaserTempColor"
          :level="phaserTemp"
          :label="String(phaserTemp)"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Effectiveness -->
      <LcarsComplexButton
        color="secondary-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Effectiveness" :style="{ width: '8.5rem' }" />
        <SolidLevelBar
          version="horizontal"
          :max="100"
          :min="0"
          color="bg-green-3"
          :level="phaserEffectiveness"
          :label="String(Math.round(phaserEffectiveness))"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Power Output indicator -->
      <LcarsComplexButton
        color="tertiary-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Phaser Power" :style="{ width: '8.5rem' }" />
        <LcarsText
          :text="String(phaserPower)"
          color="text-white"
          :style="{ flex: '1', textAlign: 'center' }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Set Power Output -->
      <LcarsComplexButton
        color="highlight-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Set Power" :style="{ width: '6rem' }" />
        <LcarsButton
          version="round-left"
          color="highlight-dark-interactive"
          label="-"
          :style="{ width: '3rem', flex: 'none' }"
          @click="phaserPower = Math.max(0, phaserPower - 100)"
        />
        <SolidLevelBar
          version="horizontal"
          :max="PHASER_POWER_MAX"
          :min="0"
          color="bg-blue-3"
          :level="phaserPower"
        />
        <LcarsButton
          version="round-right"
          color="primary-interactive"
          label="+"
          :style="{ width: '3rem', flex: 'none' }"
          @click="phaserPower = Math.min(PHASER_POWER_MAX, phaserPower + 100)"
        />
      </LcarsComplexButton>

      <!-- Power presets -->
      <LcarsComplexButton :style="{ width: '100%', justifyContent: 'center' }">
        <LcarsCap version="round-left" color="secondary-interactive" />
        <LcarsButton
          v-for="preset in phaserPowerPresets"
          :key="preset.value"
          :label="preset.label"
          color="tertiary-interactive"
          :style="{ flex: '1' }"
          @click="phaserPower = preset.value"
        />
        <LcarsCap version="round-right" color="highlight-interactive" />
      </LcarsComplexButton>

      <!-- Lock + Targets locked -->
      <LcarsRow
        :style="{ width: '100%', gap: '0.5rem', 'align-items': 'center' }"
      >
        <LcarsButton
          version="round"
          color="highlight-dark-interactive"
          label="Lock"
          :style="{ width: '6rem', flex: 'none' }"
          @click="lockTargets"
        />
        <LcarsComplexButton color="primary-interactive" :style="{ flex: '1' }">
          <LcarsBlock label="Targets locked" :style="{ flex: '1' }" />
          <LcarsText
            :text="String(lockedTargets)"
            color="text-white"
            :style="{ width: '3rem', 'text-align': 'center' }"
          />
          <LcarsCap version="round-right" />
        </LcarsComplexButton>
      </LcarsRow>

      <!-- Fire Phasers -->
      <LcarsButton
        version="round dark-light"
        :color="statusColor('critical')"
        label="Fire Phasers"
        :style="{ width: '100%' }"
        @click="firePhasers"
      />
    </LcarsColumn>

    <!-- Column 2: Torpedo Targeting -->
    <LcarsColumn
      flex="v"
      :style="{
        'justify-content': 'flex-start',
        'align-items': 'center',
        gap: '0.75rem',
        minWidth: '30rem',
      }"
    >
      <LcarsTitle
        version="centered"
        size="small"
        text="Torpedo Targeting"
        color="text-white"
      />

      <LcarsRow :style="{ 'justify-content': 'center' }">
        <DefaultBracket
          :style="{ height: '21rem', width: '24rem' }"
          :coloring="bracketColoring"
        >
          <LcarsScanner
            version="short"
            :width="8"
            :height="8"
            :grid-data="scannerGrid"
          />
        </DefaultBracket>
      </LcarsRow>

      <!-- Tube targeting rows -->
      <LcarsComplexButton
        v-for="(tube, i) in tubes"
        :key="i"
        color="secondary-interactive"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock :label="`Tube ${i + 1}`" :style="{ width: '5.5rem' }" />
        <LcarsBlock label="X" :style="{ width: '2rem' }" />
        <LcarsText
          :text="String(targetOf(tube).x)"
          color="text-white"
          :style="{ width: '2.5rem', 'text-align': 'center' }"
        />
        <LcarsBlock label="Y" :style="{ width: '2rem' }" />
        <LcarsText
          :text="String(targetOf(tube).y)"
          color="text-white"
          :style="{ width: '2.5rem', 'text-align': 'center' }"
        />
        <LcarsBlock version="decorator" :style="{ flex: '1' }" />
        <LcarsButton
          version="round-right"
          color="tertiary-interactive"
          label="Cycle"
          :style="{ width: '7rem' }"
          @click="cycleTubeTarget(i)"
        />
      </LcarsComplexButton>
    </LcarsColumn>

    <!-- Column 3: Torpedo Control -->
    <LcarsColumn
      flex="v"
      :style="{
        'justify-content': 'flex-start',
        'align-items': 'center',
        gap: '0.75rem',
        minWidth: '30rem',
      }"
    >
      <LcarsTitle
        version="centered"
        size="small"
        text="Torpedo Control"
        color="text-white"
      />

      <!-- Stock level -->
      <LcarsComplexButton
        color="highlight-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Stock" :style="{ width: '5rem' }" />
        <SolidLevelBar
          version="horizontal"
          :max="12"
          :min="0"
          :color="torpedoStockColor"
          :level="torpedoStock"
          :label="String(torpedoStock)"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Header labels -->
      <LcarsRow :style="{ width: '100%', gap: '0.5rem' }">
        <LcarsBlock
          label="Tubes"
          color="highlight-dark-interactive"
          :style="{ width: '7rem', flex: 'none' }"
        />
        <LcarsBlock
          label="Auto-load"
          color="primary-interactive"
          :style="{ flex: '1', 'text-align': 'center' }"
        />
        <LcarsBlock
          label="Status"
          color="secondary-interactive"
          :style="{ width: '7rem', flex: 'none' }"
        />
      </LcarsRow>

      <!-- Tube control rows -->
      <LcarsRow
        v-for="(tube, i) in tubes"
        :key="i"
        :style="{ width: '100%', gap: '0.5rem', 'align-items': 'stretch' }"
      >
        <LcarsButton
          version="round"
          color="tertiary-interactive"
          :label="
            tube.status === 'Loaded' ? `Unload ${i + 1}` : `Load ${i + 1}`
          "
          :disabled="tube.status === 'Empty' && torpedoStock === 0"
          :style="{ width: '7rem', flex: 'none' }"
          @click="toggleTubeLoad(i)"
        />
        <LcarsToggleSwitch
          :model-value="tube.autoLoad"
          color="highlight-interactive"
          :style="{ flex: '1' }"
          @update:model-value="toggleAutoLoad(i)"
        />
        <LcarsBlock
          :label="tube.status"
          :version="tube.status === 'Empty' ? 'red-dark-light' : undefined"
          :color="
            tube.status === 'Loaded'
              ? useLcarsColors().lcarsColors.primary[0]
              : undefined
          "
          :style="{ width: '7rem', flex: 'none' }"
        />
      </LcarsRow>

      <!-- Fire Torpedoes -->
      <LcarsButton
        version="round dark-light"
        :color="statusColor('critical')"
        label="Fire Torpedoes"
        :disabled="!tubes.some((t) => t.status === 'Loaded')"
        :style="{ width: '100%' }"
        @click="fireTorpedoes"
      />
    </LcarsColumn>
  </LcarsRow>
</template>
