<script setup lang="ts">
import { useLcarsColors } from '@/composables/useLcarsColors'
import LcarsWrapper from '@/components/elements/LcarsWrapper.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import LcarsText from '@/components/elements/LcarsText.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'

withDefaults(defineProps<{
  outcome?: 'Victory' | 'Defeat'
  reason?: string
  rating?: string
}>(), {
  outcome: 'Victory',
  reason: 'All Klingon forces destroyed.',
  rating: 'Commander',
})

const emit = defineEmits<{ (e: 'new-game'): void }>()

const { randColor } = useLcarsColors()
</script>

<template>
  <LcarsWrapper id="rst-scr" version="column" flex="v" flexc="h" :style="{ height: '100%', 'justify-content': 'center', 'align-items': 'center' }">
    <LcarsColumn flex="v" :style="{ 'align-items': 'center', gap: '1.5rem', width: '32rem' }">
      <LcarsTitle version="centered" size="large" :text="outcome" :color="outcome === 'Victory' ? 'text-white' : 'alert-fg'" />
      <LcarsText :text="reason" color="text-white" :style="{ 'text-align': 'center' }" />
      <LcarsText :text="`Rating: ${rating}`" color="text-white" />
      <LcarsButton
        label="New Game"
        :color="randColor()"
        :style="{ width: '12rem' }"
        @click="emit('new-game')"
      />
    </LcarsColumn>
  </LcarsWrapper>
</template>
