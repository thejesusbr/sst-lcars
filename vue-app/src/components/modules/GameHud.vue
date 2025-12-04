<script setup lang="ts">
import LcarsWrapper from '@/components/elements/LcarsWrapper.vue'
import SituationPanel from './SituationPanel.vue'
import TacticalConsole from './TacticalConsole.vue'
</script>

<template>
  <LcarsWrapper id="main-scr" version="column" flex="v" :style="{ height: '100%' }">
    <SituationPanel />
    <TacticalConsole />
  </LcarsWrapper>
</template>
