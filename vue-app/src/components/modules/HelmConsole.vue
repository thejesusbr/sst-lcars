<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsComplexButton from "@/components/elements/LcarsComplexButton.vue";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsBlock from "@/components/elements/LcarsBlock.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsWrapper from "@/components/elements/LcarsWrapper.vue";
import LcarsSvg from "@/components/elements/LcarsSvg.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import SolidLevelBar from "@/components/widgets/SolidLevelBar.vue";
import DefaultBracket from "@/components/widgets/DefaultBracket.vue";
import LcarsHtmlTag from "@/components/elements/LcarsHtmlTag.vue";
import { Sound, useSound } from "@/composables/useSound";
import { useGameState } from "@/stores/useGameState";

const { playSound } = useSound();
const gameState = useGameState();

const activeDstToggle = ref<"sec" | "quad">("sec");

const toggleSysSec = (opt: "sec" | "quad") => {
  activeDstToggle.value = opt;
};

// Destinos vêm da STORE: "Snd Helm"/"Snd to Helm" do NavSensing e Star Chart
// escrevem lá, e o D-Pad daqui ajusta o mesmo campo. Set Destination é só
// informação — mover é Engage.
const destination = computed(() => ({
  quadrant: gameState.destination ?? { ...gameState.position.quadrant },
  sector: gameState.destinationSector ?? { ...gameState.position.sector },
}));

const adjustDestination = (dCol: number, dRow: number) => {
  if (activeDstToggle.value === "sec") {
    const current = destination.value.sector;
    gameState.setDestinationSector({
      col: Math.min(8, Math.max(1, current.col + dCol)),
      row: Math.min(8, Math.max(1, current.row + dRow)),
    });
  } else {
    const current = destination.value.quadrant;
    gameState.setDestination({
      col: Math.min(8, Math.max(1, current.col + dCol)),
      row: Math.min(8, Math.max(1, current.row + dRow)),
    });
  }
};

// Posição atual, sempre X,Y (col,row). Antes era texto cravado "3, 4".
const currentSectorLabel = computed(
  () => `${gameState.position.sector.col}, ${gameState.position.sector.row}`
);
const currentQuadrantLabel = computed(
  () => `${gameState.position.quadrant.col}, ${gameState.position.quadrant.row}`
);

const dirPadSvg = `<svg width="70mm" height="70mm" 
  version="1.1" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" 
  xmlns:cc="http://creativecommons.org/ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  style="display: inline-block; margin: auto">
  <metadata>
    <rdf:rdf>
      <cc:work rdf:about="">
        <dc:format>image/svg+xml</dc:format>
        <dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></dc:type>
        <dc:title></dc:title>
      </cc:work>
    </rdf:rdf>
  </metadata>
  <path id="xy_ctl_NE" class="button primary-static" d="m47 33v-32.35c15.992 2.4474 29.977 16.417 32.424 32.35z"></path>
  <path id="xy_ctl_SW" class="button primary-static" d="m33 47v32.35c-15.992-2.4474-29.977-16.417-32.424-32.35z"></path>
  <path id="xy_ctl_SE" class="button primary-static" d="m47 47v32.35c15.992-2.4474 29.977-16.417 32.424-32.35z"></path>
  <path id="xy_ctl_NW" class="button primary-static" d="m32.977 33v-32.35c-15.992 2.4474-29.977 16.417-32.424 32.35z"></path>
  <path id="xy_ctl_up" class="button tertiary-static" d="m34 10h12v-9.5c-3.8785-0.47437-8.044-0.4824-12 0z"></path>
  <path d="m44.2 2.2v5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
  <path id="xy_ctl_left" class="button tertiary-static" d="m10 46v-12h-9.5c-0.47437 3.8785-0.4824 8.044 0 12z"></path>
  <path d="m2.199 35.8h5.0271" style="fill:none;opacity:.889;stroke-width:1.2;stroke:#000000"></path>
  <path id="xy_ctl_right" class="button tertiary-static" d="m70 34v12h9.5c0.47437-3.8785 0.4824-8.044 0-12z"></path>
  <path d="m77.801 44.2h-5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
  <path id="xy_ctl_down" class="button tertiary-static" d="m46 70h-12v9.5c3.8785 0.47437 8.044 0.4824 12 0z"></path>
  <path d="m35.8 77.8v-5.0271" style="fill:none;stroke-width:1.2;stroke:#000000"></path>
  <path d="m11 34v12h23v23h12v-23h23v-12h-23v-23h-12v23z" class="secondary-static"></path>
  <path d="m34 13.49h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path d="m34 16.2h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path d="m34 19.48h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path d="m34 27.9h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
  <path d="m34 59h12" style="fill:none;stroke-width:.75;stroke:#000000"></path>
</svg>`;

const bindPadButtons = () => {
  const bind = (id: string, handler: () => void) => {
    document.getElementById(id)?.addEventListener("click", handler);
  };
  bind("xy_ctl_left", () => adjustDestination(-1, 0));
  bind("xy_ctl_right", () => adjustDestination(1, 0));
  bind("xy_ctl_up", () => adjustDestination(0, -1));
  bind("xy_ctl_down", () => adjustDestination(0, 1));
  bind("xy_ctl_NE", () => adjustDestination(1, -1));
  bind("xy_ctl_SE", () => adjustDestination(1, 1));
  bind("xy_ctl_SW", () => adjustDestination(-1, 1));
  bind("xy_ctl_NW", () => adjustDestination(-1, -1));
};

const impulsePower = computed({
  get: () => gameState.impulsePower,
  set: (val) => gameState.setImpulsePower(val),
});
const impulsePresets = [
  { label: "Off", value: 0 },
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
];
const impulseBoost = computed(() => gameState.boostActive);
const boostedImpulsePower = computed(() =>
  impulseBoost.value ? 100 : impulsePower.value
);

const boostCooldownRemaining = computed(() => gameState.boostCooldown);
const boostCooldownTotal = 8; // Máximo de turnos de cooldown (ceil(1.5 * 5))

const toggleBoost = () => {
  gameState.toggleBoost();
};

const warpFactor = computed({
  get: () => gameState.warpFactor,
  set: (val) => gameState.setWarpFactor(val),
});
// Engajado = viagem REAL em curso no estado, não um toggle visual local. O
// warp desengaja sozinho quando `warpTrip` resolve (chegada, aborto por dano).
const warpEngaged = computed(() => gameState.warpTrip !== null);
const busy = ref(false);
let warpEffect: WarpSpeed | undefined;

/**
 * Duração MÍNIMA da animação de warp, independente do relógio de turnos.
 *
 * Viagem de 1 turno resolve dentro da própria chamada de `resolvePlayerTurn`:
 * `warpTrip` é definido na etapa 1 e zerado na etapa 5, então `warpEngaged` ia
 * de `null` a `null` antes do watcher rodar — a animação simplesmente não
 * acontecia. O efeito visual precisa do seu próprio relógio, em tempo real.
 */
const WARP_MIN_VISUAL_MS = 5000;

const warpVisual = ref(false);
let warpHoldUntil = 0;
let warpVisualTimer: ReturnType<typeof setTimeout> | undefined;

/** Liga o efeito e garante o piso de duração a partir de agora. */
const startWarpVisual = () => {
  clearTimeout(warpVisualTimer);
  warpHoldUntil = Date.now() + WARP_MIN_VISUAL_MS;
  warpVisual.value = true;
};

/** Desliga só quando a viagem acabou E o piso de tempo já passou. */
const releaseWarpVisual = () => {
  clearTimeout(warpVisualTimer);
  const remaining = Math.max(0, warpHoldUntil - Date.now());
  warpVisualTimer = setTimeout(() => {
    // Viagem nova durante a cauda: não desliga, quem mandou parar é a atual.
    if (!warpEngaged.value) warpVisual.value = false;
  }, remaining);
};

// A lib nao trava TARGET_SPEED (so floor em 0) -- default da lib e SPEED=0.7,
// pensado pra um fundo sutil parado. O rastro de cada estrela usa
// WARP_EFFECT_LENGTH * SPEED, entao com warpFactor (1-8) mapeado 1:1 pra
// TARGET_SPEED o rastro mal aparece. Escalado aqui pra dar variacao visivel
// entre os niveis de warp.
const WARP_SPEED_SCALE = 15;
// SPEED_ADJ_FACTOR e mutavel na instancia (nao so no construtor) -- usado
// pra ter uma entrada em warp mais suave (nave acelerando) e uma saida bem
// mais rapida (o capitao so pode agir depois que a nave sai do warp de
// verdade, entao o dropout nao pode ficar arrastando).
const WARP_ACCEL_FACTOR = 0.08;
const WARP_DECEL_FACTOR = 0.2;

/**
 * Engage Warp: despacha o movimento DE VERDADE (antes só ligava o efeito
 * visual — a nave nunca saía do lugar). O destino vem do Set Destination; a
 * duração é `ceil(distância / warpFactor)`, então o fator escolhido aqui
 * decide quantos turnos a viagem leva.
 *
 * O efeito visual liga AQUI, no despacho aceito — não no watch de `warpTrip`.
 * Viagem de 1 turno nasce e morre dentro da mesma resolução, então esperar o
 * watch significava nunca animar.
 */
const engageWarp = async () => {
  if (busy.value || warpEngaged.value) return;
  busy.value = true;
  try {
    const res = await gameState.moveWarp();
    if (res.rejected) return;
    startWarpVisual();
    // Viagem que já resolveu no próprio turno: agenda o desligamento pro fim
    // do piso de tempo. Multi-turno cai no watch abaixo.
    if (!warpEngaged.value) releaseWarpVisual();
  } finally {
    busy.value = false;
  }
};

/** Engage Impulse: movimento intra-setor até o Set Destination de setor. */
const engageImpulse = async () => {
  if (busy.value) return;
  busy.value = true;
  try {
    await gameState.moveImpulse();
  } finally {
    busy.value = false;
  }
};

// Viagem multi-turno terminando: solta o efeito respeitando o piso de tempo.
// Viagem que começa por outro caminho que não o botão daqui também liga.
watch(warpEngaged, (engaged) => {
  if (engaged) startWarpVisual();
  else releaseWarpVisual();
});

// Som e animação seguem o VISUAL, não o estado da viagem — é o que garante o
// par entrada/saída completo mesmo num salto de 1 turno.
watch(warpVisual, (on) => {
  playSound(on ? Sound.WARP_ENTER : Sound.WARP_EXIT);
  if (!warpEffect) return;
  if (on) {
    warpEffect.SPEED_ADJ_FACTOR = WARP_ACCEL_FACTOR;
    warpEffect.TARGET_SPEED = warpFactor.value * WARP_SPEED_SCALE;
  } else {
    warpEffect.SPEED_ADJ_FACTOR = WARP_DECEL_FACTOR;
    warpEffect.TARGET_SPEED = 0;
  }
});

onMounted(() => {
  bindPadButtons();
  // TARGET_SPEED comeca em 0 (parado) -- so acelera ao clicar Engage. A lib
  // ja suaviza a transicao sozinha (SPEED_ADJ_FACTOR faz lerp exponencial de
  // SPEED em direcao a TARGET_SPEED a cada frame em WarpSpeed.move()), entao
  // e um ease-out "de fabrica".
  if (typeof window !== 'undefined' && 'WarpSpeed' in window) {
    type WarpSpeedConstructor = new (id: string, opts: Record<string, unknown>) => WarpSpeed;
    const WarpSpeedCls = (window as unknown as { WarpSpeed: WarpSpeedConstructor }).WarpSpeed;
    warpEffect = new WarpSpeedCls("vwrScrDsp", {
      warpEffectLength: 8,
      speedAdjFactor: WARP_ACCEL_FACTOR,
    });
    if (warpEffect) {
      warpEffect.TARGET_SPEED = 0;
    }
  }
});

onUnmounted(() => {
  clearTimeout(warpVisualTimer);
  if (warpEffect && typeof warpEffect.destroy === 'function') {
    warpEffect.destroy();
  }
});

// Mudar o fator no meio da animação ajusta a velocidade do efeito. Segue
// `warpVisual`, não `warpEngaged` — durante a cauda de 5s a viagem já resolveu,
// mas o efeito ainda está na tela e tem que reagir.
watch(warpFactor, (value) => {
  if (warpVisual.value && warpEffect)
    warpEffect.TARGET_SPEED = value * WARP_SPEED_SCALE;
});
</script>

<template>
  <LcarsRow
    id="hlm-cns-dsp"
    flex="h"
    flexc="h"
    :style="{ 'padding-top': '1.25rem', 'justify-content': 'space-evenly' }"
  >
    <LcarsColumn
      id="dst-pnl"
      :style="{ 'justify-content': 'flex-start' }"
      flex="v"
    >
      <!-- Título -->
      <LcarsTitle
        version="small centered"
        text="Helm Controls"
        color="text-light"
      />
      <!-- Indicador da posição atual -->
      <LcarsComplexButton id="cur-pos-ind" color="secondary-interactive">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Current Location" color="highlight-interactive" />
        <LcarsBlock
          label="Sector"
          color="highlight-dark-interactive"
          :style="{ width: '3.75rem' }"
        />
        <LcarsText id="cur-loc-sec" color="text-light" :text="currentSectorLabel" />
        <LcarsBlock label="System" :style="{ width: '3.75rem' }" />
        <LcarsText id="cur-loc-sys" color="text-light" :text="currentQuadrantLabel" />
        <LcarsCap version="round-right" color="tertiary-static" />
      </LcarsComplexButton>

      <!-- Pad de direção -->
      <LcarsWrapper
        id="hlm-dir-pad-wrp"
        flex="h"
        :style="{ 'justify-content': 'center' }"
      >
        <LcarsSvg id="hlm-dir-pad" :xml="dirPadSvg" />
      </LcarsWrapper>

      <!-- Entrada de destino -->
      <LcarsComplexButton
        id="set-dst-inp"
        color="secondary-interactive"
        :style="{ 'justify-content': 'center' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Set Destination" :style="{ width: '7.5rem' }" />
        <LcarsButton
          label="Sector"
          :style="{
            width: '3.75rem',
            flex: 'none',
            filter: activeDstToggle === 'sec' ? '' : 'brightness(0.6)',
          }"
          @click="toggleSysSec('sec')"
        />
        <LcarsText
          id="dst-sec-ind"
          color="text-light"
          :text="`${destination.sector.col}, ${destination.sector.row}`"
          :style="{
            filter: activeDstToggle === 'sec' ? '' : 'brightness(0.6)',
          }"
        />
        <LcarsButton
          id="dst-quad"
          label="Quadrant"
          :style="{
            width: '3.75rem',
            flex: 'none',
            filter: activeDstToggle === 'quad' ? '' : 'brightness(0.6)',
          }"
          @click="toggleSysSec('quad')"
        />
        <LcarsText
          id="dst-quad-ind"
          color="text-light"
          :text="`${destination.quadrant.col}, ${destination.quadrant.row}`"
          :style="{
            filter: activeDstToggle === 'quad' ? '' : 'brightness(0.6)',
          }"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Indicador de potência de impulso -->
      <LcarsComplexButton id="impPwrInd" color="tertiary-interactive">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Impulse Power" :style="{ width: '7.5rem' }" />
        <LcarsText id="impPwr" :text="`${boostedImpulsePower}%`" />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <!-- Seleção da potência de impulso -->
      <LcarsComplexButton id="impPwrSel">
        <LcarsCap version="round-left" color="highlight-interactive" />
        <LcarsBlock
          label="Set Impulse"
          :style="{ width: '7.5rem' }"
          color="highlight-dark-interactive"
        />
        <LcarsButton
          version="round-left"
          color="primary-interactive"
          label="-"
          :style="{ width: '1.5rem', flex: 'none' }"
          @click="impulsePower = Math.max(0, impulsePower - 5)"
        />
        <SolidLevelBar
          id="impPwrSelBar"
          version="horizontal"
          :max="100"
          :min="0"
          color="primary-static"
          :level="boostedImpulsePower"
        />
        <LcarsButton
          version="round-right"
          color="secondary-interactive"
          label="+"
          :style="{ width: '1.5rem', flex: 'none' }"
          @click="impulsePower = Math.min(100, impulsePower + 5)"
        />
      </LcarsComplexButton>

      <!-- Botões de preset de potência de impulso -->
      <LcarsComplexButton
        id="impPwrPresets"
        :style="{ justifyContent: 'center' }"
      >
        <LcarsCap version="round-left" color="tertiary-interactive" />
        <LcarsButton
          v-for="preset in impulsePresets"
          :key="preset.value"
          :label="preset.label"
          color="highlight-interactive"
          :style="{ flex: '1' }"
          @click="impulsePower = preset.value"
        />
        <LcarsCap version="round-right" color="highlight-dark-interactive" />
      </LcarsComplexButton>

      <!-- Indicador de boost -->
      <LcarsComplexButton id="impBoostCtn">
        <LcarsCap version="round-left" color="primary-interactive" />
        <LcarsButton
          id="impBoost"
          label="Boost"
          color="secondary-interactive"
          :class="{
            'white-flash': impulseBoost,
            blink: boostCooldownRemaining > 0,
          }"
          :style="{ width: '7.5rem', flex: 'none' }"
          @click="toggleBoost"
        />
        <SolidLevelBar
          id="impBoostCooldownBar"
          version="horizontal"
          :max="Math.max(boostCooldownTotal, 1)"
          :min="0"
          color="primary-static"
          :level="boostCooldownRemaining"
        />
        <LcarsCap version="round-right" color="tertiary-interactive" />
      </LcarsComplexButton>
      <LcarsButton
        id="btn-eng-imp"
        label="Engage Impulse"
        class="dark-light"
        color="highlight-interactive"
        version="round"
        :disabled="busy || warpVisual"
        :style="{ alignSelf: 'center', width: '50%' }"
        @click="engageImpulse"
      />
    </LcarsColumn>
    <!-- Controles de dobra -->
    <LcarsColumn
      id="wrpPnl"
      :style="{
        'justify-content': 'flex-start',
        'align-items': 'center',
      }"
      flex="v"
    >
      <!-- Título -->
      <LcarsTitle
        version="small centered"
        text="Warp Controls"
        color="text-light"
      />
      <!-- Indicador de fator de dobra -->
      <LcarsComplexButton id="wrpFctInd" color="highlight-interactive">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Warp Factor" :style="{ width: '15rem' }" />
        <LcarsText id="wrpFct" :text="warpFactor.toFixed(1)" />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
      <LcarsComplexButton id="wrpFctSel">
        <LcarsCap version="round-left" color="highlight-dark-interactive" />
        <LcarsBlock
          label="Set Warp"
          :style="{ width: '7.5rem' }"
          color="primary-interactive"
        />
        <LcarsButton
          version="round-left"
          color="secondary-interactive"
          label="-"
          :style="{ width: '1.5rem', flex: 'none' }"
          @click="warpFactor = Math.max(1, warpFactor - 1)"
        />
        <SolidLevelBar
          id="wrpFctSelBar"
          version="horizontal"
          :max="8"
          :min="1"
          color="primary-static"
          :level="warpFactor"
        />
        <LcarsButton
          version="round-right"
          color="tertiary-interactive"
          label="+"
          :style="{ width: '1.5rem', flex: 'none' }"
          @click="warpFactor = Math.min(8, warpFactor + 1)"
        />
      </LcarsComplexButton>

      <LcarsButton
        id="wrpEng"
        version="round"
        :label="warpVisual ? 'Warp Engaged' : 'Engage Warp'"
        color="highlight-interactive"
        :class="{ 'white-flash': warpVisual, 'dark-lite': !warpVisual }"
        :disabled="busy || warpVisual"
        :style="{
          width: '15rem',
          flex: 'none',
        }"
        @click="engageWarp"
      />

      <DefaultBracket
        id="vwrScr"
        :style="{ height: '300px' }"
        :coloring="{
          elbow: 'tertiary-static',
          column1: ['primary-static', 'tertiary-static', 'primary-static'],
          column2: ['secondary-static', 'tertiary-static', 'secondary-static'],
          column3: ['primary-static', 'tertiary-static', 'primary-static'],
          column4: ['secondary-static', 'tertiary-static', 'secondary-static'],
          animated: 'pale-canary-bg',
        }"
      >
        <LcarsHtmlTag
          id="vwrScrDsp"
          tag="canvas"
          :style="{ height: '100%', width: '100%' }"
        />
      </DefaultBracket>
    </LcarsColumn>
  </LcarsRow>
</template>
