<script setup lang="ts">
import { useLcarsColors } from '@/composables/useLcarsColors'
import LcarsWrapper from '@/components/elements/LcarsWrapper.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import LcarsText from '@/components/elements/LcarsText.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'

withDefaults(defineProps<{
  commanderName?: string
  missionText?: string
}>(), {
  commanderName: 'James T. Kirk',
  missionText: 'Destroy the Klingon fleet before Stardate 3612.0 runs out.',
})

const emit = defineEmits<{ (e: 'start'): void }>()

const { randColor } = useLcarsColors()
</script>

<template>
  <LcarsWrapper id="brf-scr" version="column" flex="v" flexc="h" :style="{ height: '100%', 'justify-content': 'center', 'align-items': 'center' }">
    <LcarsColumn flex="v" :style="{ 'align-items': 'center', gap: '1.5rem', width: '32rem' }">
      <LcarsTitle version="centered" size="large" text="Mission Briefing" color="text-white" />
      <LcarsText :text="`Commander: ${commanderName}`" color="text-white" />
      <LcarsText :text="missionText" color="text-white" :style="{ 'text-align': 'center' }" />
      <LcarsButton
        label="Start"
        :color="randColor()"
        :style="{ width: '12rem' }"
        @click="emit('start')"
      />
    </LcarsColumn>
  </LcarsWrapper>
</template>
