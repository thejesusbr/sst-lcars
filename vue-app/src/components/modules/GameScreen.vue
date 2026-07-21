<script setup lang="ts">
import BriefingScreen from './BriefingScreen.vue'
import GameHud from './GameHud.vue'
import ResultScreen from './ResultScreen.vue'

withDefaults(defineProps<{
  mode?: 'briefing' | 'playing' | 'result'
}>(), {
  mode: 'playing',
})
</script>

<template>
  <BriefingScreen v-if="mode === 'briefing'" />
  <GameHud v-else-if="mode === 'playing'" />
  <ResultScreen v-else-if="mode === 'result'" />
</template>
