<script setup lang="ts">
import { useLcarsColors } from '@/composables/useLcarsColors'
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsComplexButton from '@/components/elements/LcarsComplexButton.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import SolidLevelBar from '@/components/widgets/SolidLevelBar.vue'

const { randColor } = useLcarsColors()
</script>

<template>
  <LcarsRow id="engCnsDsp" flexc="h" :style="{ 'justify-content': 'space-evenly' }">
    <LcarsColumn flex="v" :style="{ 'justify-content': 'center', 'align-items': 'center', width: '25rem' }">
      <LcarsTitle version="centered" size="small" text="Energy Matrix" />
      
      <LcarsComplexButton :color="randColor()" size="large">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Main Energy" />
        <SolidLevelBar
          id="maiEngInd"
          version="horizontal"
          :max="4500"
          :min="0"
          :color="randColor()"
          :level="4500"
          label="4500"
        />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
      
      <LcarsBlock size="large" :color="randColor()" />
    </LcarsColumn>

    <LcarsColumn>
      <LcarsRow :style="{ 'justify-content': 'center' }">
        <LcarsTitle version="centered" size="small" text="Damage Control" />
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>
