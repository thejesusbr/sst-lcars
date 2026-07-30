<script setup lang="ts">
import { ref, computed } from "vue";
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
import { useGameState } from "@/stores/useGameState";
import { useQuadrantCells } from "@/composables/useQuadrantCells";

const props = withDefaults(
  defineProps<{
    galaxyGrid?: Record<string, ScannerCell>;
  }>(),
  {
    galaxyGrid: undefined,
  }
);

const gameState = useGameState();
const { quadrantCells } = useQuadrantCells();

// Mapa acumulado do que o jogador JÁ explorou — não a verdade da galáxia.
// `gameState.galaxy` tem o conteúdo real dos 64 quadrantes, mas ler dali aqui
// daria omnisciência: o Star Chart só mostra `exploredQuadrants`.
// Opacidade por confiança: dado velho de LRS esmaece até o piso de 30%.
const activeGalaxyGrid = computed(() =>
  props.galaxyGrid ??
  quadrantCells(
    gameState.exploredQuadrants,
    gameState.position.quadrant,
    gameState.quadrantConfidence
  )
);

// Seleção começa no quadrante da nave, não numa coordenada fixa.
const selectedSystem = ref({ ...gameState.position.quadrant });

// Display sempre X,Y (col,row); a chave interna row,col não vaza pra UI.
const selectedSystemLabel = computed(() =>
  `${selectedSystem.value.col},${selectedSystem.value.row}`
);

const handleCellClick = (data: {
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

/** "Snd to Helm": grava o destino no estado — é o Helm que engaja o warp. */
const sendSystemToHelm = () => {
  gameState.setDestination({ ...selectedSystem.value });
};
</script>

<template>
  <LcarsRow
    id="str-cns-dsp"
    :style="{
      'justify-content': 'space-evenly',
      width: '100%',
      'align-items': 'flex-start',
      'padding-top': '1.25rem',
    }"
  >
    <LcarsColumn
      id="str-cht-pnl"
      flex="v"
      :style="{
        'justify-content': 'center',
        'align-items': 'center',
        gap: '1rem',
      }"
    >
      <LcarsTitle
        version="centered"
        size="small"
        text="Star Chart"
        color="text-light"
      />

      <!-- Mapa da galáxia (grid 8x8 de quadrantes) -->
      <LcarsRow :style="{ 'justify-content': 'center' }">
        <DefaultBracket
          id="str-cht-vwr"
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
          <LcarsScanner
            id="glxScn"
            version="long"
            :width="8"
            :height="8"
            :grid-data="activeGalaxyGrid"
            @cell-click="handleCellClick"
          />
        </DefaultBracket>
      </LcarsRow>

      <!-- Selected System -->
      <LcarsRow
        :style="{ 'justify-content': 'center', gap: '0.5rem', width: '42rem' }"
      >
        <LcarsComplexButton color="primary-interactive" :style="{ flex: '1' }">
          <LcarsCap version="round-left" />
          <LcarsBlock label="Selected System" :style="{ width: '10rem' }" />
          <LcarsText
            :text="selectedSystemLabel"
            :style="{ flex: '1', 'text-align': 'center' }"
          />
          <LcarsBlock version="decorator" :style="{ width: '2rem' }" />
        </LcarsComplexButton>
        <LcarsButton
          version="round"
          color="secondary-interactive"
          label="Snd to Helm"
          :style="{ width: '10rem' }"
          @click="sendSystemToHelm"
        />
      </LcarsRow>

      <!-- Legenda -->
      <LcarsRow :style="{ 'justify-content': 'space-evenly', width: '42rem' }">
        <LcarsText text="K = Klingon" color="text-light" />
        <LcarsText text="B = Base" color="text-light" />
        <LcarsText text="S = Star" color="text-light" />
        <LcarsText text="??? = Unexplored" color="text-light" />
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>
