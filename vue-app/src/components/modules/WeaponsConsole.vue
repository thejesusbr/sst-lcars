<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useLcarsColors } from '@/composables/useLcarsColors'
import { useScannerIcons, ScannerEntity } from '@/composables/useScannerIcons'
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'
import LcarsComplexButton from '@/components/elements/LcarsComplexButton.vue'
import LcarsText from '@/components/elements/LcarsText.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import LcarsScanner from '@/components/elements/LcarsScanner.vue'
import LcarsToggleSwitch from '@/components/elements/LcarsToggleSwitch.vue'
import DefaultBracket from '@/components/widgets/DefaultBracket.vue'
import SolidLevelBar from '@/components/widgets/SolidLevelBar.vue'

const props = withDefaults(defineProps<{
  initialStock?: number
  initialPhaserTemp?: number
  initialTargets?: number
}>(), {
  initialStock: 8,
  initialPhaserTemp: 50,
  initialTargets: 3,
})

const { randColor } = useLcarsColors()
const { getIcon } = useScannerIcons()

interface Tube {
  targetX: number
  targetY: number
  status: 'Empty' | 'Loaded'
  autoLoad: boolean
}

const phaserTemp = ref(props.initialPhaserTemp)
const phaserPower = ref(1500)
const lockedTargets = ref(props.initialTargets)
const torpedoStock = ref(props.initialStock)

const tubes = ref<Tube[]>([
  { targetX: 3, targetY: 2, status: 'Empty', autoLoad: false },
  { targetX: 6, targetY: 7, status: 'Empty', autoLoad: false },
  { targetX: 2, targetY: 5, status: 'Empty', autoLoad: false },
])

watch(() => props.initialPhaserTemp, (val) => { phaserTemp.value = val })
watch(() => props.initialStock, (val) => { torpedoStock.value = val })
watch(() => props.initialTargets, (val) => { lockedTargets.value = val })

const phaserEffectiveness = computed(() =>
  Math.max(0, 100 - phaserTemp.value / 2.7)
)

const phaserTempColor = computed(() => {
  if (phaserTemp.value < 100) return 'bg-blue-3'
  if (phaserTemp.value < 200) return 'golden-tanoi-bg'
  return 'alert-bg'
})

const torpedoStockColor = computed(() => {
  if (torpedoStock.value > 4) return 'bg-green-3'
  if (torpedoStock.value > 0) return 'golden-tanoi-bg'
  return 'alert-bg'
})

const scannerGrid = computed(() => {
  const grid: Record<string, { img?: string }> = {
    '4,4': { img: getIcon(ScannerEntity.PLAYER) },
  }
  tubes.value.forEach(tube => {
    const key = `${tube.targetY},${tube.targetX}`
    if (key !== '4,4') {
      grid[key] = { img: getIcon(ScannerEntity.KLINGON_CRUISER) }
    }
  })
  return grid
})

const bracketColoring = {
  elbow: 'bg-green-4',
  column1: ['bg-blue-1', 'bg-green-2', 'bg-blue-1'],
  column2: ['bg-blue-3', 'bg-green-4', 'bg-blue-3'],
  column3: ['bg-blue-1', 'bg-green-2', 'bg-blue-1'],
  column4: ['bg-blue-3', 'bg-green-4', 'bg-blue-3'],
  animated: 'bg-red-1',
}

const firePhasers = () => {
  phaserTemp.value = Math.min(270, phaserTemp.value + 30)
}

const lockTargets = () => {
  lockedTargets.value = Math.max(0, lockedTargets.value)
}

const cycleTubeTarget = (index: number) => {
  tubes.value[index].targetX = Math.floor(Math.random() * 8) + 1
  tubes.value[index].targetY = Math.floor(Math.random() * 8) + 1
}

const loadTube = (index: number) => {
  if (torpedoStock.value > 0 && tubes.value[index].status === 'Empty') {
    torpedoStock.value -= 1
    tubes.value[index].status = 'Loaded'
  }
}

const toggleAutoLoad = (index: number) => {
  tubes.value[index].autoLoad = !tubes.value[index].autoLoad
}

const fireTorpedoes = () => {
  const hasLoaded = tubes.value.some(t => t.status === 'Loaded')
  if (hasLoaded) {
    tubes.value.forEach(tube => {
      if (tube.status === 'Loaded') {
        tube.status = 'Empty'
      }
    })
    lockedTargets.value = Math.max(0, lockedTargets.value - 1)
    phaserTemp.value = Math.min(270, phaserTemp.value + 30)
  }
}
</script>

<template>
  <LcarsRow id="wpnCnsDsp" flexc="h" :style="{ 'justify-content': 'space-evenly', gap: '2rem', width: '100%' }">

    <!-- Column 1: Phaser Bank Control -->
    <LcarsColumn
      flex="v"
      :style="{ 'justify-content': 'flex-start', 'align-items': 'center', gap: '0.75rem', width: '22rem' }"
    >
      <LcarsTitle version="centered" size="small" text="Phaser Bank Control" color="text-white" />

      <!-- Temperature -->
      <LcarsComplexButton :color="randColor()" size="large" :style="{ width: '100%' }">
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
      <LcarsComplexButton :color="randColor()" size="large" :style="{ width: '100%' }">
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

      <!-- Set Power Output -->
      <LcarsComplexButton :color="randColor()" size="large" :style="{ width: '100%' }">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Set Power" :style="{ width: '6rem' }" />
        <LcarsButton
          version="round"
          :color="randColor()"
          label="-"
          :style="{ width: '3rem', flex: 'none' }"
          @click="phaserPower = Math.max(0, phaserPower - 100)"
        />
        <SolidLevelBar
          version="horizontal"
          :max="3000"
          :min="0"
          color="bg-blue-3"
          :level="phaserPower"
          :label="String(phaserPower)"
        />
        <LcarsButton
          version="round-right"
          :color="randColor()"
          label="+"
          :style="{ width: '3rem', flex: 'none' }"
          @click="phaserPower = Math.min(3000, phaserPower + 100)"
        />
      </LcarsComplexButton>

      <!-- Lock + Targets locked -->
      <LcarsRow :style="{ width: '100%', gap: '0.5rem', 'align-items': 'center' }">
        <LcarsButton
          version="round"
          :color="randColor()"
          label="Lock"
          :style="{ width: '6rem', flex: 'none' }"
          @click="lockTargets"
        />
        <LcarsComplexButton :color="randColor()" :style="{ flex: '1' }">
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
        color="alert-bg"
        label="Fire Phasers"
        :style="{ width: '100%' }"
        @click="firePhasers"
      />
    </LcarsColumn>

    <!-- Column 2: Torpedo Targeting -->
    <LcarsColumn
      flex="v"
      :style="{ 'justify-content': 'flex-start', 'align-items': 'center', gap: '0.75rem', width: '26rem' }"
    >
      <LcarsTitle version="centered" size="small" text="Torpedo Targeting" color="text-white" />

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
        :color="randColor()"
        :style="{ width: '100%' }"
      >
        <LcarsCap version="round-left" />
        <LcarsBlock :label="`Tube ${i + 1}`" :style="{ width: '5.5rem' }" />
        <LcarsBlock label="X" :style="{ width: '2rem' }" />
        <LcarsText
          :text="String(tube.targetX)"
          color="text-white"
          :style="{ width: '2.5rem', 'text-align': 'center' }"
        />
        <LcarsBlock label="Y" :style="{ width: '2rem' }" />
        <LcarsText
          :text="String(tube.targetY)"
          color="text-white"
          :style="{ width: '2.5rem', 'text-align': 'center' }"
        />
        <LcarsBlock version="decorator" :style="{ flex: '1' }" />
        <LcarsButton
          version="round-right"
          :color="randColor()"
          label="Cycle"
          :style="{ width: '7rem' }"
          @click="cycleTubeTarget(i)"
        />
      </LcarsComplexButton>
    </LcarsColumn>

    <!-- Column 3: Torpedo Control -->
    <LcarsColumn
      flex="v"
      :style="{ 'justify-content': 'flex-start', 'align-items': 'center', gap: '0.75rem', width: '24rem' }"
    >
      <LcarsTitle version="centered" size="small" text="Torpedo Control" color="text-white" />

      <!-- Stock level -->
      <LcarsComplexButton :color="randColor()" size="large" :style="{ width: '100%' }">
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
        <LcarsBlock label="Tubes" :color="randColor()" :style="{ width: '7rem', flex: 'none' }" />
        <LcarsBlock label="Auto-load" :color="randColor()" :style="{ flex: '1', 'text-align': 'center' }" />
        <LcarsBlock label="Status" :color="randColor()" :style="{ width: '7rem', flex: 'none' }" />
      </LcarsRow>

      <!-- Tube control rows -->
      <LcarsRow
        v-for="(tube, i) in tubes"
        :key="i"
        :style="{ width: '100%', gap: '0.5rem', 'align-items': 'stretch' }"
      >
        <LcarsButton
          version="round"
          :color="randColor()"
          :label="`Load ${i + 1}`"
          :disabled="torpedoStock === 0 || tube.status === 'Loaded'"
          :style="{ width: '7rem', flex: 'none' }"
          @click="loadTube(i)"
        />
        <LcarsToggleSwitch
          :model-value="tube.autoLoad"
          :color="randColor()"
          :style="{ flex: '1' }"
          @update:model-value="toggleAutoLoad(i)"
        />
        <LcarsBlock
          :label="tube.status"
          :version="tube.status === 'Empty' ? 'red-dark-light' : undefined"
          :color="tube.status === 'Loaded' ? 'bg-green-5' : undefined"
          :style="{ width: '7rem', flex: 'none' }"
        />
      </LcarsRow>

      <!-- Fire Torpedoes -->
      <LcarsButton
        version="round dark-light"
        color="alert-bg"
        label="Fire Torpedoes"
        :disabled="!tubes.some(t => t.status === 'Loaded')"
        :style="{ width: '100%' }"
        @click="fireTorpedoes"
      />
    </LcarsColumn>

  </LcarsRow>
</template>
