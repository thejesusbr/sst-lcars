<script setup lang="ts">
import { ref } from 'vue'
import { useLcarsColors } from '@/composables/useLcarsColors'
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsWrapper from '@/components/elements/LcarsWrapper.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'
import LcarsBar from '@/components/elements/LcarsBar.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'
import LcarsElbow from '@/components/elements/LcarsElbow.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import HelmConsole from './HelmConsole.vue'
import ShieldConsole from './ShieldConsole.vue'
import WeaponsConsole from './WeaponsConsole.vue'
import NavSensingConsole from './NavSensingConsole.vue'
import EngineeringConsole from './EngineeringConsole.vue'
import StarChartConsole from './StarChartConsole.vue'

const { randColor, lcarsColors } = useLcarsColors()

type ConsoleType = 'helm' | 'shield' | 'weapons' | 'nav' | 'engineering' | 'starchart'

const activeConsole = ref<ConsoleType>('engineering')

const toggleConsole = (console: ConsoleType) => {
  activeConsole.value = console
}
</script>

<template>
  <LcarsRow id="tct-cns" flexc="v">
    <LcarsColumn flex="v" id="tct-cns-mnu" :style="{ width: '7.5rem' }">
      <LcarsElbow size="medium" direction="top-left no-event" :color="lcarsColors.primary[7]" />
      
      <LcarsButton
        id="hlm-cns-btn"
        label="Helm"
        :color="randColor()"
        :style="{ filter: activeConsole === 'helm' ? '' : 'brightness(0.6)' }"
        @click="toggleConsole('helm')"
      />

      <LcarsButton
        id="shd-cns-btn"
        label="Shields"
        :color="randColor()"
        :style="{ filter: activeConsole === 'shield' ? '' : 'brightness(0.6)' }"
        @click="toggleConsole('shield')"
      />

      <LcarsButton
        id="wpn-cns-btn"
        label="Weapons"
        :color="randColor()"
        :style="{ filter: activeConsole === 'weapons' ? '' : 'brightness(0.6)' }"
        @click="toggleConsole('weapons')"
      />

      <LcarsButton
        id="nav-cns-btn"
        label="Nav & Sensing"
        :color="randColor()"
        :style="{ filter: activeConsole === 'nav' ? '' : 'brightness(0.6)' }"
        @click="toggleConsole('nav')"
      />

      <LcarsButton
        id="eng-cns-btn"
        label="Engineering"
        :color="randColor()"
        :style="{ filter: activeConsole === 'engineering' ? '' : 'brightness(0.6)' }"
        @click="toggleConsole('engineering')"
      />

      <LcarsButton
        id="str-cns-btn"
        label="Star Chart"
        :color="randColor()"
        :style="{ filter: activeConsole === 'starchart' ? '' : 'brightness(0.6)' }"
        @click="toggleConsole('starchart')"
      />

      <LcarsBlock label="1234 56" version="dark-light" :color="randColor()" />
      <LcarsBlock flexc="v" :color="randColor()" />
    </LcarsColumn>

    <LcarsWrapper version="column" flex="v" flexc="h" id="tct-cns-scr">
      <LcarsRow id="tct-cns-hdr" version="frame" :style="{ padding: '0 .25rem' }">
        <LcarsBar :style="{ width: '7.5rem' }" :color="lcarsColors.primary[7]" />
        <LcarsBar :style="{ width: '7.5rem' }" :color="randColor()" />
        <LcarsBar flexc="h" :color="randColor()" />
        <LcarsCap version="round-right" size="small" :color="randColor()" />
      </LcarsRow>

      <LcarsWrapper version="row" flexc="v" id="tct-cns-ctn" :style="{ 'justify-content': 'space-evenly', 'overflow-y': 'auto', 'min-height': '0' }">
        <HelmConsole v-show="activeConsole === 'helm'" />
        <ShieldConsole v-show="activeConsole === 'shield'" :active="activeConsole === 'shield'" />
        <WeaponsConsole v-show="activeConsole === 'weapons'" />
        <NavSensingConsole v-show="activeConsole === 'nav'" />
        <EngineeringConsole v-show="activeConsole === 'engineering'" />
        <StarChartConsole v-show="activeConsole === 'starchart'" />
      </LcarsWrapper>

      <LcarsRow :style="{ 'flex-direction': 'row-reverse' }">
        <LcarsTitle size="small" color="text-white" text="Tactical Console" />
      </LcarsRow>
    </LcarsWrapper>
  </LcarsRow>
</template>
