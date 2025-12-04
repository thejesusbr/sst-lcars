<script setup lang="ts">
import { useLcarsColors } from '@/composables/useLcarsColors'
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'
import LcarsBar from '@/components/elements/LcarsBar.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'
import LcarsElbow from '@/components/elements/LcarsElbow.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import LcarsText from '@/components/elements/LcarsText.vue'
import LcarsComplexButton from '@/components/elements/LcarsComplexButton.vue'
import SolidLevelBar from '@/components/widgets/SolidLevelBar.vue'

const { randColor, lcarsColors } = useLcarsColors()
</script>

<template>
  <LcarsRow id="stn-pnl" :style="{ height: '7.5rem' }">
    <LcarsColumn flex="v" id="stn-pnl-mnu" :style="{ width: '7.5rem' }">
      <LcarsElbow size="medium" direction="top-left no-event" :color="lcarsColors.primary[7]" />
      <LcarsBlock flexc="v" :color="randColor()" />
    </LcarsColumn>

    <LcarsColumn flex="v" flexc="h" id="stn-pnl-scr">
      <LcarsRow id="stn-pnl-hdr" version="frame" :style="{ padding: '0 .25rem' }">
        <LcarsBar :style="{ width: '7.5rem' }" :color="lcarsColors.primary[7]" />
        <LcarsBar :style="{ width: '7.5rem' }" :color="randColor()" />
        <LcarsBar flexc="h" :color="randColor()" />
        <LcarsCap version="round-right" size="small" :color="randColor()" />
      </LcarsRow>

      <LcarsRow id="stn-pnl-ctn" flexc="v" :style="{ 'justify-content': 'space-evenly' }">
        <LcarsComplexButton :color="randColor()">
          <LcarsCap version="round-left" />
          <LcarsBlock label="Energy" :style="{ width: '7.5rem' }" />
          <SolidLevelBar
            id="engLvlInd"
            version="horizontal"
            :max="4500"
            :min="0"
            :color="randColor()"
            :level="4500"
            label="4500"
          />
          <LcarsCap version="round-right" />
        </LcarsComplexButton>

        <LcarsComplexButton :color="randColor()">
          <LcarsCap version="round-left" />
          <LcarsBlock label="Shields" :style="{ width: '7.5rem' }" />
          <SolidLevelBar
            id="shdLvlInd"
            version="horizontal"
            :max="2500"
            :min="0"
            :color="randColor()"
            :level="2500"
            label="2500"
          />
          <LcarsCap version="round-right" />
        </LcarsComplexButton>

        <LcarsComplexButton :color="randColor()">
          <LcarsCap version="round-left" />
          <LcarsBlock label="Stardate" :style="{ width: '7.5rem' }" />
          <LcarsText id="strDatInd" color="text-white" text="2024.325" />
          <LcarsCap version="round-right" />
        </LcarsComplexButton>

        <LcarsComplexButton :color="randColor()">
          <LcarsCap version="round-left" />
          <LcarsBlock label="Enemies" :style="{ width: '7.5rem' }" />
          <LcarsText id="enmCntInd" color="text-white" text="17" />
          <LcarsCap version="round-right" />
        </LcarsComplexButton>
      </LcarsRow>

      <LcarsRow :style="{ 'flex-direction': 'row-reverse' }">
        <LcarsTitle size="small" color="text-white" text="Situation Panel" />
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>
