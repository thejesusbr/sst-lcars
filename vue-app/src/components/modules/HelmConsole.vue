<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useLcarsColors } from "@/composables/useLcarsColors";
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

const { randColor } = useLcarsColors();

const activeDstToggle = ref<"sec" | "sys">("sec");

const toggleSysSec = (opt: "sec" | "sys") => {
  activeDstToggle.value = opt;
};

const destination = ref({
  sys: { x: 2, y: 5 },
  sec: { x: 4, y: 3 },
});

const adjustDestination = (dx: number, dy: number) => {
  const target = destination.value[activeDstToggle.value];
  target.x = Math.min(8, Math.max(1, target.x + dx));
  target.y = Math.min(8, Math.max(1, target.y + dy));
};

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
  // Botoes horizontais alteram X, verticais alteram Y, diagonais alteram
  // ambas -- tudo no eixo (sys/sec) escolhido pelo toggle System/Sector.
  bind("xy_ctl_left", () => adjustDestination(-1, 0));
  bind("xy_ctl_right", () => adjustDestination(1, 0));
  bind("xy_ctl_up", () => adjustDestination(0, -1));
  bind("xy_ctl_down", () => adjustDestination(0, 1));
  bind("xy_ctl_NE", () => adjustDestination(1, -1));
  bind("xy_ctl_SE", () => adjustDestination(1, 1));
  bind("xy_ctl_SW", () => adjustDestination(-1, 1));
  bind("xy_ctl_NW", () => adjustDestination(-1, -1));
};

const impulsePower = ref(50);
const impulsePresets = [
  { label: "Off", value: 0 },
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
];
const impulseBoost = ref(false);
const boostedImpulsePower = computed(() =>
  impulseBoost.value ? 100 : impulsePower.value
);

const BOOST_MAX_DURATION = 60; // segundos
const BOOST_COOLDOWN_BASE = 30; // segundos, minimo

const boostCooldownTotal = ref(0);
const boostCooldownRemaining = ref(0);
const canActivateBoost = computed(
  () => !impulseBoost.value && boostCooldownRemaining.value === 0
);

let boostActivatedAt = 0;
let boostTimer: ReturnType<typeof setTimeout> | undefined;
let cooldownInterval: ReturnType<typeof setInterval> | undefined;

const startCooldown = (seconds: number) => {
  clearInterval(cooldownInterval);
  boostCooldownTotal.value = seconds;
  boostCooldownRemaining.value = seconds;
  cooldownInterval = setInterval(() => {
    boostCooldownRemaining.value = Math.max(
      0,
      boostCooldownRemaining.value - 0.1
    );
    if (boostCooldownRemaining.value === 0) clearInterval(cooldownInterval);
  }, 100);
};

const deactivateBoost = () => {
  if (!impulseBoost.value) return;
  impulseBoost.value = false;
  clearTimeout(boostTimer);
  const activeSeconds = (Date.now() - boostActivatedAt) / 1000;
  startCooldown(
    BOOST_COOLDOWN_BASE + Math.max(0, activeSeconds - BOOST_COOLDOWN_BASE)
  );
};

const toggleBoost = () => {
  if (impulseBoost.value) {
    deactivateBoost();
    return;
  }
  if (!canActivateBoost.value) return;
  impulseBoost.value = true;
  boostActivatedAt = Date.now();
  boostTimer = setTimeout(deactivateBoost, BOOST_MAX_DURATION * 1000);
};

const warpFactor = ref(2);
const warpEngaged = ref(false);
let warpEffect: WarpSpeed | undefined;

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

const engageWarp = () => {
  warpEngaged.value = !warpEngaged.value;
  if (!warpEffect) return;
  if (warpEngaged.value) {
    warpEffect.SPEED_ADJ_FACTOR = WARP_ACCEL_FACTOR;
    warpEffect.TARGET_SPEED = warpFactor.value * WARP_SPEED_SCALE;
  } else {
    warpEffect.SPEED_ADJ_FACTOR = WARP_DECEL_FACTOR;
    warpEffect.TARGET_SPEED = 0;
  }
};

onMounted(() => {
  bindPadButtons();
  // TARGET_SPEED comeca em 0 (parado) -- so acelera ao clicar Engage. A lib
  // ja suaviza a transicao sozinha (SPEED_ADJ_FACTOR faz lerp exponencial de
  // SPEED em direcao a TARGET_SPEED a cada frame em WarpSpeed.move()), entao
  // e um ease-out "de fabrica".
  warpEffect = new WarpSpeed("vwrScrDsp", {
    warpEffectLength: 8,
    speedAdjFactor: WARP_ACCEL_FACTOR,
  });
  warpEffect.TARGET_SPEED = 0;
});

onUnmounted(() => {
  warpEffect?.destroy();
  clearTimeout(boostTimer);
  clearInterval(cooldownInterval);
});

watch(warpFactor, (value) => {
  if (warpEngaged.value && warpEffect)
    warpEffect.TARGET_SPEED = value * WARP_SPEED_SCALE;
});
</script>

<template>
  <LcarsRow
    id="hlm-cns-dsp"
    flex="h"
    flexc="h"
    :style="{ 'justify-content': 'space-evenly' }"
  >
    <LcarsColumn id="dst-pnl" :style="{ 'justify-content': 'center' }" flex="v">
      <LcarsComplexButton id="cur-pos-ind" :color="randColor()">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Current Location" :style="{ width: '7.5rem' }" />
        <LcarsBlock label="System" :style="{ width: '3.75rem' }" />
        <LcarsText id="cur-loc-sys" color="text-white" text="3, 4" />
        <LcarsBlock label="Sector" :style="{ width: '3.75rem' }" />
        <LcarsText id="cur-loc-sec" color="text-white" text="3, 4" />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <LcarsTitle
        version="small centered"
        text="Helm Controls"
        color="text-white"
      />

      <LcarsWrapper
        id="hlm-dir-pad-wrp"
        flex="h"
        :style="{ 'justify-content': 'center' }"
      >
        <LcarsSvg id="hlm-dir-pad" :xml="dirPadSvg" />
      </LcarsWrapper>

      <LcarsComplexButton
        id="set-dst-inp"
        :color="randColor()"
        :style="{ 'justify-content': 'center' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock label="Set Destination" :style="{ width: '7.5rem' }" />
        <LcarsButton
          label="System"
          :style="{
            width: '3.75rem',
            flex: 'none',
            filter: activeDstToggle === 'sys' ? '' : 'brightness(0.6)',
          }"
          @click="toggleSysSec('sys')"
        />
        <LcarsText
          id="dst-sys-ind"
          color="text-white"
          :text="`${destination.sys.x}, ${destination.sys.y}`"
        />
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
          color="text-white"
          :text="`${destination.sec.x}, ${destination.sec.y}`"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <LcarsComplexButton id="impPwrInd" :color="randColor()">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Impulse Power" :style="{ width: '7.5rem' }" />
        <LcarsText id="impPwr" :text="`${boostedImpulsePower}%`" />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>

      <LcarsComplexButton id="impPwrSel">
        <LcarsCap version="round-left" :color="randColor()" />
        <LcarsBlock
          label="Set Impulse"
          :style="{ width: '7.5rem' }"
          :color="randColor()"
        />
        <LcarsButton
          version="round-left"
          :color="randColor()"
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
          :color="randColor()"
          label="+"
          :style="{ width: '1.5rem', flex: 'none' }"
          @click="impulsePower = Math.min(100, impulsePower + 5)"
        />
      </LcarsComplexButton>

      <LcarsComplexButton id="impPwrPresets" :style="{ justifyContent: 'center' }">
        <LcarsCap version="round-left" :color="randColor()" />
        <LcarsButton
          v-for="preset in impulsePresets"
          :key="preset.value"
          :label="preset.label"
          :color="randColor()"
          :style="{ flex: '1' }"
          @click="impulsePower = preset.value"
        />
        <LcarsCap version="round-right" :color="randColor()" />
      </LcarsComplexButton>

      <LcarsComplexButton id="impBoostCtn">
        <LcarsCap version="round-left" :color="randColor()" />
        <LcarsButton
          id="impBoost"
          label="Boost"
          :color="randColor()"
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
        <LcarsCap version="round-right" :color="randColor()" />
      </LcarsComplexButton>
    </LcarsColumn>

    <LcarsColumn
      id="wrpPnl"
      :style="{ 'justify-content': 'center', 'align-items': 'center' }"
      flex="v"
    >
      <LcarsComplexButton id="wrpFctInd" :color="randColor()">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Warp Factor" :style="{ width: '15rem' }" />
        <LcarsText id="wrpFct" :text="warpFactor.toFixed(1)" />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
      <LcarsComplexButton id="wrpFctSel">
        <LcarsCap version="round-left" :color="randColor()" />
        <LcarsBlock
          label="Set Warp"
          :style="{ width: '7.5rem' }"
          :color="randColor()"
        />
        <LcarsButton
          version="round-left"
          :color="randColor()"
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
          :color="randColor()"
          label="+"
          :style="{ width: '1.5rem', flex: 'none' }"
          @click="warpFactor = Math.min(8, warpFactor + 1)"
        />
      </LcarsComplexButton>

      <LcarsButton
        id="wrpEng"
        version="round"
        label="Engage"
        :color="randColor()"
        :class="{ 'white-flash': warpEngaged }"
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
