<script setup lang="ts">
import LcarsWrapper from "@/components/elements/LcarsWrapper.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsRow from "../elements/LcarsRow.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";
import DefaultBarFrame from "../widgets/DefaultBarFrame.vue";

withDefaults(
  defineProps<{
    commanderName?: string;
    shipName?: string;
    missionText?: string;
  }>(),
  {
    commanderName: "James T. Kirk",
    shipName: "U.S.S. Enterprise NCC-1701-D",
    missionText: "Destroy the Klingon fleet before Stardate 3612.0 runs out.",
  }
);

const emit = defineEmits<{ (e: "start"): void; (e: "regenerate"): void }>();
</script>

<template>
  <DefaultBarFrame
    label="United Federations of Planets"
    :coloring="{
      headerCapLeft: 'primary-interactive',
      headerBar: 'primary-interactive',
      headerCapRight: 'primary-interactive',
      footerCapLeft: 'secondary-interactive',
      footerBar: 'highlight-interactive',
      footerCapRight: 'secondary-interactive',
    }"
  >
    <LcarsWrapper
      id="brf-scr"
      version="column"
      flex="v"
      flexc="h"
      :style="{
        height: '100%',
        'justify-content': 'center',
        'align-items': 'center',
      }"
    >
      <LcarsColumn
        flex="v"
        :style="{ 'align-items': 'center', gap: '1.5rem', width: '32rem' }"
      >
        <LcarsTitle
          version="centered"
          size="large"
          text="Mission Briefing"
          color="text-light"
        />
        <LcarsText :text="`Commander: ${commanderName}`" color="text-light" />
        <LcarsText :text="`Ship: ${shipName}`" color="text-light" />
        <LcarsText
          :text="missionText"
          color="text-light"
          :style="{ 'text-align': 'center' }"
        />
        <LcarsRow :style="{ 'justify-content': 'center', gap: '1rem' }">
          <LcarsButton
            label="Start"
            color="primary-interactive"
            :style="{ width: '12rem' }"
            @click="emit('start')"
          />
          <LcarsButton
            label="Regenerate"
            color="secondary-interactive"
            :style="{ width: '12rem' }"
            @click="emit('regenerate')"
          />
        </LcarsRow>
      </LcarsColumn>
    </LcarsWrapper>
  </DefaultBarFrame>
</template>
