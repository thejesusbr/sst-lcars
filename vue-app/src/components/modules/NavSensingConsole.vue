<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from "vue";

import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsScanner, {
  type ScannerCell,
} from "@/components/elements/LcarsScanner.vue";
import DefaultBracket from "@/components/widgets/DefaultBracket.vue";
import LcarsComplexButton from "@/components/elements/LcarsComplexButton.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import { Sound, useSound } from "@/composables/useSound";
import { useGameState } from "@/stores/useGameState";
import { usePresentation } from "@/stores/usePresentation";
import { useCombatOverlay } from "@/composables/useCombatOverlay";
import { useQuadrantCells } from "@/composables/useQuadrantCells";
import { damageFraction, isCritical, kbsCode } from "@/engine/constants";
import {
  SENSOR_MODERATE_DAMAGE,
  corruptKbsCode,
} from "@/composables/sensorDisplay";
import { scanConfidence as scanConfidenceOf } from "@/engine/navigation";
import { isEnemyType, isStarbaseType } from "@/engine/sector";

const { playSound } = useSound();

const props = withDefaults(
  defineProps<{
    shortRangeGrid?: Record<string, ScannerCell>;
  }>(),
  {
    shortRangeGrid: undefined,
  }
);

const gameState = useGameState();
const presentation = usePresentation();
const combatOverlay = useCombatOverlay();
const { sectorCells, quadrantCells } = useQuadrantCells();

const selectedSector = ref({ ...gameState.position.sector });
const selectedSystem = ref({ ...gameState.position.quadrant });

// Display SEMPRE X,Y (col,row) — a convenção interna row,col nunca vaza pra UI.
const xy = (c: { row: number; col: number }) => `${c.col},${c.row}`;
const selectedSectorLabel = computed(() => xy(selectedSector.value));
const selectedSystemLabel = computed(() => xy(selectedSystem.value));

const remainingProbes = computed(() => gameState.remainingProbes);
// Status vem da missão de sonda no estado, não de um `setTimeout`: a sonda
// resolve no relógio de TURNOS (distância + 1), não em tempo real.
const probeStatus = computed(() =>
  gameState.probe ? ("Active" as const) : ("Offline" as const)
);
const probeTurnsLeft = computed(() => gameState.probe?.turnsRemaining ?? 0);

// SRS em crítico ou desligado se comporta como cego: só a própria nave aparece.
const srsOnline = computed(
  () => gameState.subsystemsOn.srs && !isCritical(gameState.subsystems.srs)
);

// ── Degradação do DISPLAY por dano no sensor ───────────────────────────────
//
// Distinto da perda de confiança, que segue inalterada (esmaecimento gradual
// por turno). Aqui é EQUIPAMENTO falhando, não informação envelhecendo: um
// quadrante pode estar esmaecido (dado velho) e estável, ou nítido e tremendo
// (sensor quebrado) — problemas diferentes, soluções diferentes (rescanear vs.
// reparar).

const srsBlinking = computed(
  () =>
    damageFraction(gameState.subsystems.srs) > SENSOR_MODERATE_DAMAGE &&
    !isCritical(gameState.subsystems.srs)
);
const lrsBlinking = computed(
  () =>
    damageFraction(gameState.subsystems.lrs) > SENSOR_MODERATE_DAMAGE &&
    !isCritical(gameState.subsystems.lrs)
);
/** Em crítico o display apaga por completo — nem a própria nave aparece. */
const srsDark = computed(() => isCritical(gameState.subsystems.srs));
const lrsDark = computed(() => isCritical(gameState.subsystems.lrs));

/**
 * Contador que faz os dígitos do KBS dançarem enquanto o LRS está danificado.
 *
 * Timer local de exibição, sem relação com a fila de turno — o que ele muda é
 * um número na tela, nunca o estado.
 */
const jitter = ref(0);
let jitterTimer: ReturnType<typeof setInterval> | undefined;

watch(
  () => lrsBlinking.value,
  (damaged) => {
    clearInterval(jitterTimer);
    jitterTimer = damaged
      ? setInterval(() => (jitter.value += 1), 420)
      : undefined;
  },
  { immediate: true }
);

onUnmounted(() => clearInterval(jitterTimer));

const corruptCode = (code: string, key: string): string =>
  corruptKbsCode(code, key, jitter.value);

const activeShortRangeGrid = computed(() => {
  if (srsDark.value) return {};
  return (
    props.shortRangeGrid ??
    sectorCells(gameState.currentSector, gameState.position.sector, {
      srsOnline: srsOnline.value,
    })
  );
});

// LRS classico so cobre os quadrantes VIZINHOS (bloco 3x3 ao redor da nave)
// e nao tem memoria -- some de novo ate o proximo Scan. Isso que o distingue
// do Star Chart (COM 4, StarChartConsole.vue), que e o mapa acumulado de tudo
// ja explorado na galaxia inteira e nao precisa ser re-escaneado.
// Ver SST_LCARS_SPECS.md 3.2/5.2/12.7.
const longRangeScanned = computed(
  () => Object.keys(gameState.lrsScan).length > 0
);

const lrsDisabled = computed(
  () => !gameState.subsystemsOn.lrs || isCritical(gameState.subsystems.lrs)
);

// Confiança decai com a idade do scan, e o dano no LRS ACELERA o decaimento
// (`5% × (1 + d)`/turno, piso 30%). É a mesma função do engine, não uma cópia.
const scanConfidence = computed(() =>
  scanConfidenceOf(gameState.lrsScanAge, gameState.subsystems.lrs)
);

const longRangeGrid = computed(() => {
  if (lrsDark.value) return quadrantCells({}, gameState.position.quadrant, {});

  // Confiança POR ENTRADA: sonda cria entrada com idade própria (datalink), o
  // scan clássico zera todas — cada uma esmaece no seu ritmo.
  const codes: Record<string, { code: string }> = {};
  const confidence: Record<string, number> = {};
  for (const [key, entry] of Object.entries(gameState.lrsScan)) {
    // Cópia, nunca a entrada do estado: a corrupção abaixo escreveria no save.
    codes[key] = {
      code: lrsBlinking.value ? corruptCode(entry.code, key) : entry.code,
    };
    confidence[key] = scanConfidenceOf(entry.age, gameState.subsystems.lrs);
  }

  // O quadrante ATUAL aparece sempre, a 100% — o SRS já escaneou onde a nave
  // está, isso não depende do LRS nem esmaece.
  const here = gameState.position.quadrant;
  const hereKey = `${here.row},${here.col}`;
  const content = gameState.galaxy?.[hereKey];
  if (content) {
    const here_code = kbsCode({
      klingons: content.klingons,
      bases: content.baseIds.length,
      stars: content.stars,
    });
    codes[hereKey] = {
      code: lrsBlinking.value ? corruptCode(here_code, hereKey) : here_code,
    };
    confidence[hereKey] = 1;
  }

  return quadrantCells(codes, here, confidence);
});

const handleShortRangeCellClick = (data: {
  row: number;
  col: number;
  isBorder: boolean;
  label: string | null;
  cellData: ScannerCell | null;
  event: MouseEvent;
}) => {
  if (!data.isBorder) {
    selectedSector.value = { row: data.row, col: data.col };
  }
};

const handleLongRangeCellClick = (data: {
  row: number;
  col: number;
  isBorder: boolean;
  label: string | null;
  cellData: ScannerCell | null;
  event: MouseEvent;
}) => {
  if (!data.isBorder) {
    selectedSystem.value = { row: data.row, col: data.col };
  }
};

const busy = ref(false);

/** Envolve ação que consome turno: evita duplo clique disparar 2 turnos. */
const withTurn = async (fn: () => Promise<unknown>) => {
  if (busy.value) return;
  busy.value = true;
  try {
    await fn();
  } finally {
    busy.value = false;
  }
};

/**
 * Só INFORMA o Helm (indicador Set Destination). O movimento em si dispara no
 * "Engage Impulse"/"Engage Warp" de lá — é o que permite ajustar potência/fator
 * antes de partir, e são eles que decidem a duração da viagem.
 */
const sendToHelm = () => {
  gameState.setDestinationSector({ ...selectedSector.value });
};

/**
 * Todo alvo hailável do setor — inimigo ou base, não cloacado. Hail alcança
 * o setor INTEIRO, não só a célula selecionada: não é arma, não precisa de
 * mira (hail-and-identity design.md decisão 1).
 */
const hailTargets = computed(() =>
  gameState.currentSector.filter(
    (e) => !e.cloaked && (isEnemyType(e.type) || isStarbaseType(e.type))
  )
);

/**
 * Alvo do hail, por `id` estável.
 *
 * Um só alvo válido no setor: implícito, de qualquer célula selecionada. Mais
 * de um: o jogador escolhe clicando a célula do alvo desejado — o engine NÃO
 * decide por conta própria entre, por exemplo, uma base e um inimigo no mesmo
 * setor, que têm consequências opostas.
 */
const hailTargetId = computed(() => {
  if (hailTargets.value.length === 0) return null;
  if (hailTargets.value.length === 1) return hailTargets.value[0].id;
  const target = selectedSector.value;
  return (
    hailTargets.value.find(
      (e) => e.position.row === target.row && e.position.col === target.col
    )?.id ?? null
  );
});

const hail = () =>
  withTurn(async () => {
    if (!hailTargetId.value) return;
    playSound(Sound.HAIL);
    await gameState.hail(hailTargetId.value);
  });

// Atracagem é LIVRE (não resolve turno): é o loop de docking que consome.
const dock = () => {
  if (gameState.docked) {
    gameState.undock();
    playSound(Sound.POWER_DOWN);
    return;
  }
  const res = gameState.dock();
  if (res.docked) playSound(Sound.POWER_UP);
};

/** Equipe emprestável: idle é a primeira escolha. */
const availableTeam = computed(
  () => gameState.teams.find((t) => t.status === "idle") ?? null
);

const sendParty = () =>
  withTurn(async () => {
    if (!availableTeam.value) return;
    playSound(Sound.TRANSPORTER);
    await gameState.sendPartyTo(availableTeam.value.id, {
      ...selectedSector.value,
    });
  });

/** Scan de LRS: revela o bloco 3x3 no estado, sem custo de turno. */
const scanLongRange = () => {
  if (lrsDisabled.value) return;
  gameState.scanLongRange();
};

const sendSystemToHelm = () => {
  gameState.setDestination({ ...selectedSystem.value });
};

const sendProbe = () =>
  withTurn(async () => {
    playSound(Sound.PROBE_LAUNCH);
    await gameState.launchProbe({ ...selectedSystem.value });
  });

const toggleSrs = () => {
  playSound(gameState.subsystemsOn.srs ? Sound.POWER_DOWN : Sound.POWER_UP);
  gameState.toggleSubsystemOn("srs");
};

const toggleLrs = () => {
  playSound(gameState.subsystemsOn.lrs ? Sound.POWER_DOWN : Sound.POWER_UP);
  gameState.toggleSubsystemOn("lrs");
};
</script>

<template>
  <LcarsRow
    id="nav-cns-dsp"
    flexc="h"
    :style="{
      'align-items': 'flex-start',
      'padding-top': '1.25rem',
      'justify-content': 'space-evenly',
    }"
  >
    <!-- Short-range scanner column -->
    <LcarsColumn
      id="shr-scn-pnl"
      flex="v"
      :style="{
        'justify-content': 'center',
        'align-items': 'flex-start',
        gap: '1rem',
      }"
    >
      <LcarsTitle
        version="centered"
        size="small"
        text="Short-range scanner"
        color="text-light"
      />
      <LcarsRow :style="{ 'justify-content': 'center' }">
        <DefaultBracket
          id="shr-scn-vwr"
          :style="{ height: '21rem', width: '24rem' }"
          :coloring="{
            elbow: 'tertiary-static',
            column1: ['primary-static', 'tertiary-static', 'primary-static'],
            column2: [
              'secondary-static',
              'tertiary-static',
              'secondary-static',
            ],
            column3: ['primary-static', 'tertiary-static', 'primary-static'],
            column4: [
              'secondary-static',
              'tertiary-static',
              'secondary-static',
            ],
            animated: 'pale-canary-bg',
          }"
        >
          <div :class="{ 'sensor-blink': srsBlinking }">
            <LcarsScanner
              id="shtRngScn"
              version="short"
              :width="8"
              :height="8"
              :grid-data="activeShortRangeGrid"
              :overlay="combatOverlay"
              @cell-click="handleShortRangeCellClick"
            />
          </div>
        </DefaultBracket>
      </LcarsRow>

      <!-- Selected Sector Complex Button -->
      <LcarsComplexButton
        id="snd-hlm-sec"
        color="primary-interactive"
        :style="{ width: '24rem', flex: 'none' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Selected sector" :style="{ width: '10rem' }" />
        <LcarsText
          id="snd-hlm-sec-txt"
          :text="selectedSectorLabel"
          :style="{ width: '4rem', 'text-align': 'center' }"
        />
        <LcarsBlock version="decorator" :style="{ width: '2rem' }" />
        <LcarsButton
          id="tpd-tgt-cyc-tb1"
          version="round"
          color="secondary-interactive"
          label="Snd Helm"
          :style="{ width: '8rem' }"
          @click="sendToHelm"
        />
      </LcarsComplexButton>

      <!-- Auxiliary controls -->
      <LcarsRow :style="{ 'justify-content': 'space-evenly', width: '24rem' }">
        <LcarsButton
          id="srs-toggle-btn"
          version="round"
          :label="gameState.subsystemsOn.srs ? 'SRS On' : 'SRS Off'"
          :color="gameState.subsystemsOn.srs ? 'secondary-interactive' : 'primary-static'"
          :style="{ width: '6rem' }"
          @click="toggleSrs"
        />
        <LcarsButton
          id="hail-btn"
          version="round"
          color="tertiary-interactive"
          label="Hail"
          :disabled="!hailTargetId || busy || presentation.busy"
          :style="{ width: '7rem' }"
          @click="hail"
        />
        <LcarsButton
          id="dock-btn"
          version="round"
          color="highlight-interactive"
          :label="gameState.docked ? 'Undock' : 'Dock'"
          :disabled="(!gameState.docked && !gameState.canDockNow) || presentation.busy"
          :style="{ width: '7rem' }"
          @click="dock"
        />
        <LcarsButton
          id="send-party-btn"
          version="round"
          color="highlight-dark-interactive"
          label="Snd Party"
          :disabled="!availableTeam || busy || presentation.busy"
          :style="{ width: '8rem' }"
          @click="sendParty"
        />
      </LcarsRow>
    </LcarsColumn>

    <!-- Long-range scanner column -->
    <LcarsColumn
      id="lgrScPnl"
      flex="v"
      :style="{
        'justify-content': 'center',
        'align-items': 'flex-start',
      }"
    >
      <LcarsTitle
        version="centered"
        size="small"
        text="Long range scanner"
        color="text-light"
      />
      <LcarsRow :style="{ 'justify-content': 'center' }">
        <DefaultBracket
          id="lgrScnVwr"
          :style="{ height: '21rem', width: '42rem' }"
          :coloring="{
            elbow: 'tertiary-static',
            column1: ['primary-static', 'tertiary-static', 'primary-static'],
            column2: [
              'secondary-static',
              'tertiary-static',
              'secondary-static',
            ],
            column3: ['primary-static', 'tertiary-static', 'primary-static'],
            column4: [
              'secondary-static',
              'tertiary-static',
              'secondary-static',
            ],
            animated: 'pale-canary-bg',
          }"
        >
          <div :class="{ 'sensor-blink': lrsBlinking }">
            <LcarsScanner
              id="lngRngScn"
              version="long"
              :width="8"
              :height="8"
              :grid-data="longRangeGrid"
              @cell-click="handleLongRangeCellClick"
            />
          </div>
        </DefaultBracket>
      </LcarsRow>

      <!-- LRS code legend -->
      <LcarsText
        text="Code: KBS — K=Klingons  B=Starbases  S=Stars"
        color="text-light"
        :style="{
          width: '42rem',
          textAlign: 'center',
          fontSize: '1.15rem',
          opacity: '0.75',
        }"
      />
      <LcarsRow
        v-if="longRangeScanned"
        :style="{
          'justify-content': 'center',
          'align-items': 'center',
          gap: '1rem',
        }"
      >
        <LcarsText
          :text="`Signal confidence: ${Math.round(scanConfidence * 100)}%`"
          color="text-light"
          :style="{ textAlign: 'center', fontSize: '1rem', opacity: '0.6' }"
        />
      </LcarsRow>

      <!-- Controls row: Scan, Selected System, Snd to Helm -->
      <LcarsRow :style="{ 'justify-content': 'space-evenly', width: '42rem' }">
        <LcarsButton
          id="lrs-toggle-btn"
          version="round"
          :label="gameState.subsystemsOn.lrs ? 'LRS On' : 'LRS Off'"
          :color="gameState.subsystemsOn.lrs ? 'secondary-interactive' : 'primary-static'"
          :style="{ width: '6rem' }"
          @click="toggleLrs"
        />
        <LcarsButton
          id="lngScnBtn"
          version="round"
          label="Scan"
          color="secondary-interactive"
          :disabled="lrsDisabled"
          :style="{ width: '8rem' }"
          @click="scanLongRange"
        />
        <LcarsComplexButton
          color="tertiary-interactive"
          :style="{ width: '22rem' }"
        >
          <LcarsCap version="round-left" />
          <LcarsBlock label="Selected System" :style="{ width: '12rem' }" />
          <LcarsText
            id="sndHlmSysTxt"
            :text="selectedSystemLabel"
            :style="{ width: '4rem', 'text-align': 'center' }"
          />
          <LcarsBlock version="decorator" :style="{ width: '4rem' }" />
        </LcarsComplexButton>
        <LcarsButton
          id="sndSysHlm"
          version="round"
          color="highlight-interactive"
          label="Snd to Helm"
          :style="{ width: '10rem' }"
          @click="sendSystemToHelm"
        />
      </LcarsRow>

      <!-- Probe Control section -->
      <LcarsTitle
        version="centered"
        size="small"
        text="Probe control"
        color="text-light"
      />
      <LcarsRow :style="{ 'justify-content': 'center', width: '42rem' }">
        <LcarsComplexButton
          color="highlight-dark-interactive"
          :style="{ width: '42rem' }"
        >
          <LcarsCap version="round-left" />
          <LcarsBlock label="Remaining Probes" :style="{ width: '12rem' }" />
          <LcarsText
            id="rmnPrbTxt"
            :text="String(remainingProbes)"
            :style="{ width: '3rem', 'text-align': 'center' }"
          />
          <LcarsBlock version="decorator" :style="{ width: '2rem' }" />
          <LcarsBlock
            id="prbStsInd"
            :label="probeStatus === 'Active' ? `T-${probeTurnsLeft}` : probeStatus"
            :version="probeStatus === 'Offline' ? 'red-dark-light' : undefined"
            :color="probeStatus !== 'Offline' ? 'bg-green-5' : undefined"
            :style="{ width: '7rem' }"
          />
          <LcarsButton
            version="round-right"
            size="large"
            label="Send to selected system"
            color="primary-interactive"
            :style="{ width: '16rem' }"
            :disabled="remainingProbes === 0 || probeStatus !== 'Offline' || busy || presentation.busy"
            @click="sendProbe"
          />
        </LcarsComplexButton>
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>

<style scoped>
/* Dano MODERADO no sensor: o display pisca. É equipamento falhando, distinto do
   esmaecimento por confiança, que é informação envelhecendo (spec
   `turn-presentation`, "Sensor damage degrades the display itself"). */
.sensor-blink {
  animation: sensor-flicker 1.1s steps(1, end) infinite;
}

@keyframes sensor-flicker {
  0%,
  62%,
  74%,
  100% {
    opacity: 1;
  }
  66%,
  70% {
    opacity: 0.18;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sensor-blink {
    animation: none;
    opacity: 0.65;
  }
}
</style>
