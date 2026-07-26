<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsComplexButton from "@/components/elements/LcarsComplexButton.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import SolidLevelBar from "@/components/widgets/SolidLevelBar.vue";

// Props to control values from outside (e.g. Storybook)
const props = withDefaults(
  defineProps<{
    warpIntegrity?: number;
    srsIntegrity?: number;
    lrsIntegrity?: number;
    phaserIntegrity?: number;
    photonIntegrity?: number;
    shieldIntegrity?: number;
    damageIntegrity?: number;
    lifeIntegrity?: number;
    warpCoreIntegrity?: number;
  }>(),
  {
    warpIntegrity: 100,
    srsIntegrity: 100,
    lrsIntegrity: 100,
    phaserIntegrity: 100,
    photonIntegrity: 100,
    shieldIntegrity: 100,
    damageIntegrity: 100,
    lifeIntegrity: 100,
    warpCoreIntegrity: 100,
  }
);

const { statusColor } = useLcarsColors();

// Nova mecanica de energia (substitui o antigo Main Energy dreno/carga):
// o WC entrega um output nominal fixo, e os subsistemas da nave consomem
// dele. Main Energy sempre mostra esse nominal -- nao e mais um recurso que
// esvazia. Se o consumo total passar do output, o WC entra em sobrecorga
// automaticamente.
const WARP_CORE_OUTPUT = 4500;

// Mock local do consumo total roteado aos subsistemas -- indicador passivo,
// soma da energia alocada em cada console de subsistema (Weapons/Helm/Shield).
// Alocacao real por subsistema ainda nao existe (Fase 4, useGameState); ate
// la fica fixo. Ver SST_LCARS_SPECS.md.
const subsystemDraw = ref(3000);

// Interface for subsystems in Damage Control
interface Subsystem {
  name: string;
  key: string;
  integrity: number;
}

// Reactive state for subsystems
const subsystems = ref<Subsystem[]>([
  { name: "Warp Engines", key: "warp", integrity: props.warpIntegrity },
  { name: "Short-Range Sensors", key: "srs", integrity: props.srsIntegrity },
  { name: "Long-Range Sensors", key: "lrs", integrity: props.lrsIntegrity },
  { name: "Phaser Banks", key: "phasers", integrity: props.phaserIntegrity },
  { name: "Photon Tubes", key: "photons", integrity: props.photonIntegrity },
  { name: "Shield Control", key: "shields", integrity: props.shieldIntegrity },
  { name: "Damage Control", key: "damage", integrity: props.damageIntegrity },
  { name: "Life Support", key: "life", integrity: props.lifeIntegrity },
  { name: "Warp Core", key: "warpCore", integrity: props.warpCoreIntegrity },
]);

// Watch props to sync Storybook changes dynamically
watch(
  () => props.warpIntegrity,
  (val) => {
    subsystems.value[0].integrity = val;
  }
);
watch(
  () => props.srsIntegrity,
  (val) => {
    subsystems.value[1].integrity = val;
  }
);
watch(
  () => props.lrsIntegrity,
  (val) => {
    subsystems.value[2].integrity = val;
  }
);
watch(
  () => props.phaserIntegrity,
  (val) => {
    subsystems.value[3].integrity = val;
  }
);
watch(
  () => props.photonIntegrity,
  (val) => {
    subsystems.value[4].integrity = val;
  }
);
watch(
  () => props.shieldIntegrity,
  (val) => {
    subsystems.value[5].integrity = val;
  }
);
watch(
  () => props.damageIntegrity,
  (val) => {
    subsystems.value[6].integrity = val;
  }
);
watch(
  () => props.lifeIntegrity,
  (val) => {
    subsystems.value[7].integrity = val;
  }
);
watch(
  () => props.warpCoreIntegrity,
  (val) => {
    subsystems.value[8].integrity = val;
  }
);

// Sobrecarga automatica: dispara so quando subsystemDraw > WARP_CORE_OUTPUT,
// valor = % de quanto passou do output, minimo 1% assim que estourar.
const autoOverload = computed(() => {
  if (subsystemDraw.value <= WARP_CORE_OUTPUT) return 0;
  const excessPercent =
    ((subsystemDraw.value - WARP_CORE_OUTPUT) / WARP_CORE_OUTPUT) * 100;
  return Math.max(1, Math.round(excessPercent));
});

// Sobrecarga manual: dial que o engenheiro roda de proposito (0-20%, curva
// de risco da seção 10.2 do specs). Soma com a automatica no overload real
// do core -- as duas empurram o WC alem da capacidade, uma de proposito,
// outra por consequencia de rotear energia demais.
const manualOverload = ref(0);
const OVERLOAD_MAX = 20;
const OVERLOAD_PRESETS = [0, 25, 50, 75, 100].map((percent) => ({
  label: `${percent}%`,
  value: Math.round((percent / 100) * OVERLOAD_MAX),
}));

const overload = computed(() => manualOverload.value + autoOverload.value);

const overloadColor = computed(() => {
  if (overload.value < 8) return statusColor("nominal");
  if (overload.value <= 15) return statusColor("damaged");
  return statusColor("critical");
});

// Equipes de Controle de Danos (CdD) — mock local, sem lógica de fadiga real (Fase 3.5)
interface DamageControlTeam {
  id: number;
  efficiency: number;
  assignedSystem: string | null;
  status: "idle" | "working" | "cooldown";
}

const teams = ref<DamageControlTeam[]>([
  { id: 1, efficiency: 100, assignedSystem: null, status: "idle" },
  { id: 2, efficiency: 79, assignedSystem: "Warp Core", status: "working" },
  {
    id: 3,
    efficiency: 63,
    assignedSystem: "Shield Control",
    status: "working",
  },
  { id: 4, efficiency: 100, assignedSystem: null, status: "idle" },
  { id: 5, efficiency: 39, assignedSystem: null, status: "cooldown" },
  { id: 6, efficiency: 20, assignedSystem: "Warp Core", status: "working" },
]);

const teamEfficiencyColor = (efficiency: number) => {
  if (efficiency > 60) return statusColor("nominal");
  if (efficiency > 20) return statusColor("damaged");
  return statusColor("critical");
};

const dispatchTargets = subsystems.value.map((sys) => sys.name);

const cycleAssignment = (team: DamageControlTeam) => {
  if (team.assignedSystem === null) {
    team.assignedSystem = dispatchTargets[0];
    team.status = "working";
    return;
  }
  const currentIndex = dispatchTargets.indexOf(team.assignedSystem);
  const nextIndex = currentIndex + 1;
  if (nextIndex >= dispatchTargets.length) {
    team.assignedSystem = null;
    team.status = "idle";
  } else {
    team.assignedSystem = dispatchTargets[nextIndex];
  }
};

// Helper to return style class and status text based on integrity level
const getSystemStatus = (integrity: number) => {
  if (integrity === 100) {
    return {
      text: "OPERATIONAL",
      color: statusColor("nominal"),
      isBlinking: false,
    };
  } else if (integrity > 0) {
    return {
      text: "DAMAGED",
      color: statusColor("damaged"),
      isBlinking: false,
    };
  } else {
    return {
      text: "OFFLINE",
      color: statusColor("critical"),
      isBlinking: true, // Red blinking offline status
    };
  }
};

// Simulated interaction controls
const repairAll = () => {
  subsystems.value.forEach((sys) => {
    sys.integrity = 100;
  });
};

const simulateDamage = () => {
  const randomIndex = Math.floor(Math.random() * subsystems.value.length);
  const isOffline = Math.random() > 0.5;
  subsystems.value[randomIndex].integrity = isOffline
    ? 0
    : Math.floor(Math.random() * 90) + 5;
};
</script>

<template>
  <LcarsRow
    id="engCnsDsp"
    flexc="h"
    :style="{ 'justify-content': 'space-evenly', gap: '2rem', width: '100%' }"
  >
    <!-- Column 1: Energy Matrix -->
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
        text="Energy Matrix"
        :style="{ 'margin-top': '1rem' }"
      />

      <!-- Main Energy: sempre mostra o output nominal do WC, nao e mais um
           recurso que drena -- consumo/sobrecarga sao controlados abaixo -->
      <LcarsComplexButton
        color="primary-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Main Energy" :style="{ width: '8.5rem' }" />
        <LcarsText
          :text="String(WARP_CORE_OUTPUT)"
          color="text-white"
          :style="{ flex: '1', textAlign: 'center' }"
        />
        <LcarsBlock label="Subsystem Load" :style="{ width: '8.5rem' }" />
        <LcarsText
          :text="String(subsystemDraw)"
          :color="subsystemDraw > WARP_CORE_OUTPUT ? 'alert-bg' : 'text-white'"
          :style="{ flex: '1', textAlign: 'center' }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
      <LcarsTitle
        version="centered"
        size="small"
        text="Warp Core Overload"
        :style="{ 'margin-top': '1rem' }"
      />
      <!-- Overload indicator: total real (manual + automatico por excesso
           de Subsystem Load) -->
      <LcarsComplexButton
        color="secondary-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Overload" :style="{ width: '8.5rem' }" />
        <LcarsText
          :text="`${overload}%`"
          :color="overloadColor"
          :style="{ flex: '1', textAlign: 'center', fontWeight: 'bold' }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Set Overload: dial manual, mesma linguagem visual do Set
           Power/Set Impulse -->
      <LcarsComplexButton
        color="tertiary-interactive"
        size="large"
        :style="{ width: '100%', 'margin-top': '0.5rem' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Set Overload" :style="{ width: '8.5rem' }" />
        <LcarsButton
          version="round-left"
          color="highlight-interactive"
          label="-"
          :style="{ width: '3rem', flex: 'none' }"
          @click="manualOverload = Math.max(0, manualOverload - 1)"
        />
        <SolidLevelBar
          version="horizontal"
          :max="OVERLOAD_MAX"
          :min="0"
          :color="overloadColor"
          :level="manualOverload"
        />
        <LcarsButton
          version="round-right"
          color="highlight-dark-interactive"
          label="+"
          :style="{ width: '3rem', flex: 'none' }"
          @click="manualOverload = Math.min(OVERLOAD_MAX, manualOverload + 1)"
        />
      </LcarsComplexButton>

      <LcarsComplexButton
        :style="{
          width: '100%',
          'margin-top': '0.5rem',
          justifyContent: 'center',
        }"
      >
        <LcarsCap version="round-left" color="primary-interactive" />
        <LcarsButton
          v-for="preset in OVERLOAD_PRESETS"
          :key="preset.value"
          :label="preset.label"
          color="secondary-interactive"
          :style="{ flex: '1' }"
          @click="manualOverload = preset.value"
        />
        <LcarsCap version="round-right" color="tertiary-interactive" />
      </LcarsComplexButton>
    </LcarsColumn>

    <!-- Column 2: Damage Control Teams -->
    <LcarsColumn flex="v" :style="{ flex: '1', 'max-width': '32rem' }">
      <LcarsRow
        :style="{ 'justify-content': 'center', 'margin-bottom': '1rem' }"
      >
        <LcarsTitle
          version="centered"
          size="small"
          text="Damage Control Teams"
          :style="{ 'margin-top': '1rem' }"
        />
      </LcarsRow>

      <div class="systems-grid">
        <div v-for="team in teams" :key="team.id" class="system-row">
          <LcarsComplexButton
            :color="teamEfficiencyColor(team.efficiency)"
            size="medium"
            :style="{ width: '100%' }"
          >
            <LcarsCap version="round-left" />
            <LcarsBlock
              :label="`Team ${team.id}`"
              :style="{ width: '6rem', 'text-align': 'left' }"
            />
            <LcarsText
              :text="team.efficiency + '%'"
              color="text-white"
              :style="{
                minWidth: '7.5rem',
                'text-align': 'center',
                'font-weight': 'bold',
              }"
            />
            <LcarsBlock
              :label="team.status.toUpperCase()"
              :style="{ width: '7rem' }"
            />
            <LcarsBlock version="decorator" :style="{ flex: '1' }" />
            <LcarsButton
              version="round-right"
              color="highlight-interactive"
              :label="team.assignedSystem ?? 'Dispatch'"
              :style="{ width: '11rem' }"
              @click="cycleAssignment(team)"
            />
          </LcarsComplexButton>
        </div>
      </div>
    </LcarsColumn>

    <!-- Column 3: Subsystem Integrity -->
    <LcarsColumn flex="v" :style="{ flex: '1', 'max-width': '32rem' }">
      <LcarsRow
        :style="{ 'justify-content': 'center', 'margin-bottom': '1rem' }"
      >
        <LcarsTitle
          version="centered"
          size="small"
          text="Subsystem Integrity"
          :style="{ 'margin-top': '1rem' }"
        />
      </LcarsRow>

      <!-- Systems list/grid -->
      <div class="systems-grid">
        <div v-for="sys in subsystems" :key="sys.key" class="system-row">
          <LcarsComplexButton
            :color="getSystemStatus(sys.integrity).color"
            :class="{ blink: getSystemStatus(sys.integrity).isBlinking }"
            size="medium"
            :style="{ width: '100%' }"
          >
            <LcarsCap version="round-left" />
            <!-- System Label -->
            <LcarsBlock
              :label="sys.name"
              :style="{ width: '13rem', 'text-align': 'left' }"
            />
            <!-- Textual Status -->
            <LcarsBlock
              :label="getSystemStatus(sys.integrity).text"
              :style="{ width: '9rem' }"
            />
            <!-- Integrity level (percentage) -->
            <LcarsText
              :text="sys.integrity + '%'"
              color="text-white"
              :style="{
                minWidth: '7.5rem',
                'text-align': 'right',
                'font-weight': 'bold',
              }"
            />
            <LcarsCap version="round-right" />
          </LcarsComplexButton>
        </div>
      </div>

      <!-- Damage/Repair Simulation Controls -->
      <LcarsRow
        :style="{
          'margin-top': '1.5rem',
          gap: '0.75rem',
          'justify-content': 'center',
        }"
      >
        <LcarsButton
          label="SIMULATE DAMAGE"
          color="bg-orange-3"
          :style="{ width: '15rem' }"
          @click="simulateDamage"
        />
        <LcarsButton
          label="REPAIR ALL"
          color="bg-green-3"
          :style="{ width: '15rem' }"
          @click="repairAll"
        />
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>

<style scoped>
.systems-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.system-row {
  width: 100%;
}
</style>
