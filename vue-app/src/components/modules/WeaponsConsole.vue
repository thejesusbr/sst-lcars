<script setup lang="ts">
import { computed, ref } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
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
import { Sound, useSound } from "@/composables/useSound";
import { useGameState } from "@/stores/useGameState";
import { usePresentation } from "@/stores/usePresentation";
import { useCombatOverlay } from "@/composables/useCombatOverlay";
import { useQuadrantCells } from "@/composables/useQuadrantCells";
import {
  PHASER_POWER_MAX,
  PHASER_TEMP_MAX,
  isCritical,
} from "@/engine/constants";
import { getVisibleEnemies } from "@/engine/sector";
import type { TorpedoTube } from "@/types/game";

const { playSound } = useSound();
const { statusColor } = useLcarsColors();
const { sectorCells, cellKey } = useQuadrantCells();
const gameState = useGameState();
const presentation = usePresentation();
const combatOverlay = useCombatOverlay();

// ── Phasers ──────────────────────────────────────────────────────────────────

const phaserTemp = computed(() => Math.round(gameState.phaserTemp));
const torpedoStock = computed(() => gameState.torpedoStock);

// `phaserPower` ja e em unidades de energia (0-3000) no estado -- os presets
// abaixo tambem. Sem conversao: converter aqui era o que somava com o clamp
// errado da store e derrubava o valor.
const phaserPower = computed({
  get: () => Math.round(gameState.phaserPower),
  set: (value) => gameState.setPhaserPower(value),
});

const phaserPowerPresets = [25, 50, 75, 100].map((percent) => ({
  label: `${percent}%`,
  value: Math.round((percent / 100) * PHASER_POWER_MAX),
}));

// Efetividade cai com o calor. Dano no banco de phasers piora tudo: aquece
// mais rapido, esfria mais devagar, causa menos dano (decisao #30) -- essa
// parte mora no engine; aqui e so leitura.
const phaserEffectiveness = computed(() =>
  Math.max(0, 100 - phaserTemp.value / (PHASER_TEMP_MAX / 100))
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

// ── Alvos ────────────────────────────────────────────────────────────────────

// Inimigos VISIVEIS no setor real -- cloacado nao entra, e a mesma funcao que o
// engine usa pra mirar. Antes era uma lista mock de 3 coordenadas fixas,
// desconectada do grid que o NavSensing desenhava.
const enemyTargets = computed(() => getVisibleEnemies(gameState.$state));
const lockedTargets = computed(() =>
  gameState.weaponsLocked ? enemyTargets.value.length : 0
);

const tubes = computed(() => gameState.tubes);

/** Alvo do tubo por `id` estavel, nunca por indice de array (decisao #6). */
const targetOf = (tube: TorpedoTube) =>
  enemyTargets.value.find((e) => e.id === tube.targetId) ?? null;

const targetLabel = (tube: TorpedoTube) => {
  const target = targetOf(tube);
  return target ? `${target.position.col},${target.position.row}` : "—";
};

// Grid do setor com o numero do tubo sobreposto no alvo dele.
const scannerGrid = computed(() => {
  // Mesma fonte do SRS do NavSensing: os dois desenham o MESMO setor, então
  // ler estados diferentes os faria divergir no meio da encenação.
  const view = presentation.sectorView;
  if (!view) return {};
  const grid = sectorCells(view.entities, view.ship) as Record<
    string,
    { img?: string; text?: string; color?: string }
  >;

  for (const enemy of enemyTargets.value) {
    const assigned = tubes.value
      .filter((t) => t.targetId === enemy.id)
      .map((t) => t.id);
    if (assigned.length === 0) continue;
    const key = cellKey(enemy.position);
    grid[key] = { ...grid[key], text: assigned.join(",") };
  }
  return grid;
});

const bracketColoring = {
  elbow: "primary-static",
  column1: ["tertiary-static", "secondary-static", "tertiary-static"],
  column2: ["tertiary-static", "primary-static", "tertiary-static"],
  column3: ["tertiary-static", "secondary-static", "tertiary-static"],
  column4: ["tertiary-static", "primary-static", "tertiary-static"],
  animated: "highlight-interactive",
};

// ── Acoes ────────────────────────────────────────────────────────────────────

const busy = ref(false);

const withTurn = async (fn: () => Promise<unknown>) => {
  if (busy.value) return;
  busy.value = true;
  try {
    await fn();
  } finally {
    busy.value = false;
  }
};

const phasersCritical = computed(() => isCritical(gameState.subsystems.phasers));
const photonsCritical = computed(() => isCritical(gameState.subsystems.photons));

/** Sem trava ou em critico o disparo nao sai -- o botao fica desabilitado. */
const canFirePhasers = computed(
  () =>
    gameState.weaponsLocked &&
    !phasersCritical.value &&
    enemyTargets.value.length > 0
);

const canFireTorpedoes = computed(
  () =>
    !photonsCritical.value &&
    gameState.subsystemsOn.photons &&
    tubes.value.some((t) => t.loaded)
);

const firePhasers = () =>
  withTurn(async () => {
    playSound(Sound.PHASER);
    await gameState.firePhasers();
  });

const fireTorpedoes = () =>
  withTurn(async () => {
    playSound(Sound.TORPEDO);
    await gameState.fireTorpedoes();
  });

/** "Lock" e acao real: custa 1 turno de reaquisicao (decisao #23). */
const lockTargets = () =>
  withTurn(async () => {
    await gameState.acquireLock();
  });

const canLock = computed(
  () =>
    gameState.subsystemsOn.srs &&
    !isCritical(gameState.subsystems.srs) &&
    enemyTargets.value.length > 0
);

/** Ciclar alvo e LIVRE: e so mira, nao gasta turno. */
const cycleTubeTarget = (tubeId: number) => {
  gameState.cycleTubeTarget(tubeId);
};

/** Carregar/descarregar custam 1 turno cada (decisao #31). */
const toggleTubeLoad = (tubeId: number) =>
  withTurn(async () => {
    const tube = tubes.value.find((t) => t.id === tubeId);
    if (!tube) return;
    if (tube.loaded) await gameState.unloadTube(tubeId);
    else await gameState.loadTube(tubeId);
  });

const toggleAutoLoad = (tubeId: number) => {
  gameState.toggleTubeAutoLoad(tubeId);
};

const togglePhotons = () => {
  playSound(gameState.subsystemsOn.photons ? Sound.POWER_DOWN : Sound.POWER_UP);
  gameState.toggleSubsystemOn("photons");
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
        color="text-light"
      />

      <!-- Temperature -->
      <LcarsComplexButton
        color="primary-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Temperature" />
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
        <LcarsBlock label="Effectiveness" />
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
          color="text-light"
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
          :disabled="!canLock || busy || presentation.busy"
          @click="lockTargets"
        />
        <LcarsComplexButton color="primary-interactive" :style="{ flex: '1' }">
          <LcarsBlock label="Targets locked" :style="{ flex: '1' }" />
          <LcarsText
            :text="String(lockedTargets)"
            color="text-light"
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
        :disabled="!canFirePhasers || busy || presentation.busy"
        :style="{ width: '50%' }"
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
        color="text-light"
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
            :overlay="combatOverlay"
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
        <LcarsBlock :label="`Tube ${tube.id}`" />
        <LcarsBlock label="Sector to fire" :style="{ width: '2rem' }" />
        <LcarsText
          :text="targetLabel(tube)"
          color="text-light"
          :style="{ width: '2.5rem', 'text-align': 'center' }"
        />
        <LcarsBlock version="decorator" :style="{ flex: '1' }" />
        <LcarsButton
          version="round-right"
          color="tertiary-interactive"
          label="Cycle"
          :style="{ width: '7rem' }"
          :disabled="enemyTargets.length === 0"
          @click="cycleTubeTarget(tube.id)"
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
        color="text-light"
      />

      <!-- Stock level -->
      <LcarsComplexButton
        color="highlight-interactive"
        size="large"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Stock" />
        <SolidLevelBar
          version="horizontal"
          :max="8"
          :min="0"
          :color="torpedoStockColor"
          :level="torpedoStock"
          :label="String(torpedoStock)"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Header labels -->
      <LcarsRow :style="{ width: '100%' }">
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
        :style="{ width: '100%', 'align-items': 'stretch' }"
      >
        <LcarsButton
          version="round"
          color="tertiary-interactive"
          :label="tube.loaded ? `Unload ${tube.id}` : `Load ${tube.id}`"
          :disabled="(!tube.loaded && torpedoStock === 0) || photonsCritical || busy || presentation.busy"
          :style="{ width: '7rem', flex: 'none' }"
          @click="toggleTubeLoad(tube.id)"
        />
        <LcarsToggleSwitch
          :model-value="tube.autoLoad"
          color="highlight-interactive"
          :style="{ flex: '1' }"
          @update:model-value="toggleAutoLoad(tube.id)"
        />
        <LcarsBlock
          :label="tube.loaded ? 'Loaded' : 'Empty'"
          :version="tube.loaded ? undefined : 'red-dark-light'"
          :style="{ width: '7rem', flex: 'none' }"
        />
      </LcarsRow>

      <!-- Fire Torpedoes -->
      <LcarsButton
        version="round dark-light"
        :color="statusColor('critical')"
        label="Fire Torpedoes"
        :disabled="!canFireTorpedoes || busy || presentation.busy"
        :style="{ width: '50%' }"
        @click="fireTorpedoes"
      />
      <LcarsButton
        id="photons-toggle-btn"
        version="round"
        :label="gameState.subsystemsOn.photons ? 'Photon Tubes On' : 'Photon Tubes Off'"
        :color="gameState.subsystemsOn.photons ? 'secondary-interactive' : 'primary-static'"
        :style="{ width: '50%' }"
        @click="togglePhotons"
      />
    </LcarsColumn>
  </LcarsRow>
</template>
