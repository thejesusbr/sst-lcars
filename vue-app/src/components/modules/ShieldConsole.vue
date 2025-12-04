<script setup lang="ts">
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
</script>

<template>
  <LcarsRow id="shdCnsDsp" flexc="h" :style="{ 'justify-content': 'space-evenly' }">
    <LcarsColumn flex="v" :style="{ 'justify-content': 'center', 'align-items': 'center' }">
      <LcarsTitle version="centered" size="small" text="Shield Console" color="text-white" />
    </LcarsColumn>
  </LcarsRow>
</template>
