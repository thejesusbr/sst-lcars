<script setup lang="ts">
import { ref } from 'vue'
import { useLcarsColors } from '@/composables/useLcarsColors'
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import LcarsScanner, { type ScannerCell } from '@/components/elements/LcarsScanner.vue'
import DefaultBracket from '@/components/widgets/DefaultBracket.vue'
import LcarsComplexButton from '@/components/elements/LcarsComplexButton.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'
import LcarsText from '@/components/elements/LcarsText.vue'

const props = withDefaults(defineProps<{
  galaxyGrid?: Record<string, ScannerCell>
}>(), {
  galaxyGrid: undefined,
})

const { randColor } = useLcarsColors()

// Grid demo: codigos KBS (Klingons/Bases/Estrelas) para quadrantes explorados,
// '???' para inexplorado. Ver SST_LCARS_SPECS.md secao 2.1.
const demoGalaxyGrid: Record<string, ScannerCell> = {
  '1,1': { text: '???', color: 'text-light' },
  '1,2': { text: '003', color: 'golden-tanoi-fg' },
  '2,2': { text: '104', color: 'alert-fg' },
  '2,3': { text: '???', color: 'text-light' },
  '3,4': { text: '012', color: 'anakiwa-fg' },
  '4,4': { text: '000', color: 'text-light' },
  '5,6': { text: '201', color: 'alert-fg' },
  '6,6': { text: '???', color: 'text-light' },
  '7,5': { text: '001', color: 'golden-tanoi-fg' },
  '8,8': { text: '???', color: 'text-light' },
}

const activeGalaxyGrid = ref<Record<string, ScannerCell>>(
  props.galaxyGrid ?? demoGalaxyGrid
)

const selectedQuadrant = ref('3,4')

const handleCellClick = (data: {
  row: number
  col: number
  isBorder: boolean
  label: string | null
  cellData: ScannerCell | null
  event: MouseEvent
}) => {
  if (!data.isBorder) {
    selectedQuadrant.value = `${data.row},${data.col}`
  }
}
</script>

<template>
  <LcarsRow id="str-cns-dsp" flexc="h" :style="{ 'justify-content': 'center' }">
    <LcarsColumn id="str-cht-pnl" flex="v" :style="{ 'justify-content': 'center', 'align-items': 'center', 'gap': '1rem' }">
      <LcarsTitle version="centered" size="small" text="Star Chart" color="text-white" />

      <LcarsRow :style="{ 'justify-content': 'center' }">
        <DefaultBracket
          id="str-cht-vwr"
          :style="{ height: '21rem', width: '24rem' }"
          :coloring="{
            elbow: 'tertiary-static',
            column1: ['primary-static', 'tertiary-static', 'primary-static'],
            column2: ['secondary-static', 'tertiary-static', 'secondary-static'],
            column3: ['primary-static', 'tertiary-static', 'primary-static'],
            column4: ['secondary-static', 'tertiary-static', 'secondary-static'],
            animated: 'pale-canary-bg'
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

      <!-- Selected Quadrant -->
      <LcarsComplexButton :color="randColor()" :style="{ width: '24rem', flex: 'none' }">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Selected Quadrant" :style="{ width: '10rem' }" />
        <LcarsText :text="selectedQuadrant" :style="{ flex: '1', 'text-align': 'center' }" />
        <LcarsBlock version="decorator" :style="{ width: '2rem' }" />
      </LcarsComplexButton>

      <!-- Legenda -->
      <LcarsRow :style="{ 'justify-content': 'space-evenly', width: '24rem' }">
        <LcarsText text="K = Klingon" color="text-white" />
        <LcarsText text="B = Base" color="text-white" />
        <LcarsText text="S = Star" color="text-white" />
        <LcarsText text="??? = Unexplored" color="text-light" />
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>
