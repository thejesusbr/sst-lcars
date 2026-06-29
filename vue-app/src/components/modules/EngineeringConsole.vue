<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLcarsColors } from '@/composables/useLcarsColors'
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsComplexButton from '@/components/elements/LcarsComplexButton.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'
import LcarsText from '@/components/elements/LcarsText.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'
import SolidLevelBar from '@/components/widgets/SolidLevelBar.vue'

// Props to control values from outside (e.g. Storybook)
const props = withDefaults(defineProps<{
  initialEnergy?: number
  warpIntegrity?: number
  srsIntegrity?: number
  lrsIntegrity?: number
  phaserIntegrity?: number
  photonIntegrity?: number
  shieldIntegrity?: number
  damageIntegrity?: number
  lifeIntegrity?: number
}>(), {
  initialEnergy: 4500,
  warpIntegrity: 100,
  srsIntegrity: 100,
  lrsIntegrity: 100,
  phaserIntegrity: 100,
  photonIntegrity: 100,
  shieldIntegrity: 100,
  damageIntegrity: 100,
  lifeIntegrity: 100,
})

const { randColor } = useLcarsColors()

// Reactive state for the Main Energy
const energy = ref(props.initialEnergy)

// Interface for subsystems in Damage Control
interface Subsystem {
  name: string
  key: string
  integrity: number
}

// Reactive state for subsystems
const subsystems = ref<Subsystem[]>([
  { name: 'Warp Engines', key: 'warp', integrity: props.warpIntegrity },
  { name: 'Short-Range Sensors', key: 'srs', integrity: props.srsIntegrity },
  { name: 'Long-Range Sensors', key: 'lrs', integrity: props.lrsIntegrity },
  { name: 'Phaser Banks', key: 'phasers', integrity: props.phaserIntegrity },
  { name: 'Photon Tubes', key: 'photons', integrity: props.photonIntegrity },
  { name: 'Shield Control', key: 'shields', integrity: props.shieldIntegrity },
  { name: 'Damage Control', key: 'damage', integrity: props.damageIntegrity },
  { name: 'Life Support', key: 'life', integrity: props.lifeIntegrity },
])

// Watch props to sync Storybook changes dynamically
watch(() => props.initialEnergy, (val) => { energy.value = val })
watch(() => props.warpIntegrity, (val) => { subsystems.value[0].integrity = val })
watch(() => props.srsIntegrity, (val) => { subsystems.value[1].integrity = val })
watch(() => props.lrsIntegrity, (val) => { subsystems.value[2].integrity = val })
watch(() => props.phaserIntegrity, (val) => { subsystems.value[3].integrity = val })
watch(() => props.photonIntegrity, (val) => { subsystems.value[4].integrity = val })
watch(() => props.shieldIntegrity, (val) => { subsystems.value[5].integrity = val })
watch(() => props.damageIntegrity, (val) => { subsystems.value[6].integrity = val })
watch(() => props.lifeIntegrity, (val) => { subsystems.value[7].integrity = val })

// Helper to return style class and status text based on integrity level
const getSystemStatus = (integrity: number) => {
  if (integrity === 100) {
    return {
      text: 'OPERATIONAL',
      color: 'bg-green-3', // Green shade from our custom-patched colors.css
      isBlinking: false
    }
  } else if (integrity > 0) {
    return {
      text: 'DAMAGED',
      color: 'golden-tanoi-bg', // Yellow/Orange LCARS shade
      isBlinking: false
    }
  } else {
    return {
      text: 'OFFLINE',
      color: 'alert-bg', // Red alert shade
      isBlinking: true // Red blinking offline status
    }
  }
}

// Simulated interaction controls
const repairAll = () => {
  subsystems.value.forEach(sys => {
    sys.integrity = 100
  })
}

const simulateDamage = () => {
  const randomIndex = Math.floor(Math.random() * subsystems.value.length)
  const isOffline = Math.random() > 0.5
  subsystems.value[randomIndex].integrity = isOffline ? 0 : Math.floor(Math.random() * 90) + 5
  energy.value = Math.max(0, energy.value - 200)
}
</script>

<template>
  <LcarsRow id="engCnsDsp" flexc="h" :style="{ 'justify-content': 'space-evenly', 'gap': '2rem', width: '100%' }">
    <!-- Column 1: Energy Matrix -->
    <LcarsColumn flex="v" :style="{ 'justify-content': 'flex-start', 'align-items': 'center', width: '25rem' }">
      <LcarsTitle version="centered" size="small" text="Energy Matrix" />
      
      <LcarsComplexButton :color="randColor()" size="large" :style="{ width: '100%' }">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Main Energy" :style="{ width: '8.5rem' }" />
        <SolidLevelBar
          id="maiEngInd"
          version="horizontal"
          :max="4500"
          :min="0"
          :color="energy > 1500 ? 'bg-green-3' : (energy > 500 ? 'golden-tanoi-bg' : 'alert-bg blink')"
          :level="energy"
          :label="energy.toString()"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
      
      <!-- Energy Simulation Controls -->
      <LcarsRow :style="{ 'margin-top': '1.5rem', 'gap': '0.75rem', 'width': '100%', 'justify-content': 'center' }">
        <LcarsButton
          label="DRAIN (500)"
          color="alert-bg"
          :style="{ width: '11rem' }"
          @click="energy = Math.max(0, energy - 500)"
        />
        <LcarsButton
          label="CHARGE (500)"
          color="bg-green-3"
          :style="{ width: '11rem' }"
          @click="energy = Math.min(4500, energy + 500)"
        />
      </LcarsRow>
      
      <LcarsBlock size="large" :color="randColor()" :style="{ 'margin-top': '1.5rem', width: '100%' }" />
    </LcarsColumn>

    <!-- Column 2: Damage Control -->
    <LcarsColumn flex="v" :style="{ flex: '1', 'max-width': '35rem' }">
      <LcarsRow :style="{ 'justify-content': 'center', 'margin-bottom': '1rem' }">
        <LcarsTitle version="centered" size="small" text="Damage Control" />
      </LcarsRow>
      
      <!-- Systems list/grid -->
      <div class="systems-grid">
        <div 
          v-for="sys in subsystems" 
          :key="sys.key"
          class="system-row"
        >
          <LcarsComplexButton 
            :color="getSystemStatus(sys.integrity).color" 
            :class="{ blink: getSystemStatus(sys.integrity).isBlinking }"
            size="medium"
            :style="{ width: '100%' }"
          >
            <LcarsCap version="round-left" />
            <!-- System Label -->
            <LcarsBlock :label="sys.name" :style="{ width: '13rem', 'text-align': 'left' }" />
            <!-- Textual Status -->
            <LcarsBlock :label="getSystemStatus(sys.integrity).text" :style="{ width: '9rem' }" />
            <!-- Integrity level (percentage) -->
            <LcarsText :text="sys.integrity + '%'" color="text-white" :style="{ width: '4.5rem', 'text-align': 'right', 'font-weight': 'bold' }" />
            <LcarsCap version="round-right" />
          </LcarsComplexButton>
        </div>
      </div>

      <!-- Damage/Repair Simulation Controls -->
      <LcarsRow :style="{ 'margin-top': '1.5rem', 'gap': '0.75rem', 'justify-content': 'center' }">
        <LcarsButton
          label="SIMULATE DAMAGE"
          color="atomic-tangerine-bg"
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
