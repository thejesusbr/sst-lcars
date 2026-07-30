<script setup lang="ts">
import { useLcarsColors } from "@/composables/useLcarsColors";
import LcarsWrapper from "@/components/elements/LcarsWrapper.vue";
import LcarsColumn from "@/components/elements/LcarsColumn.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import LcarsText from "@/components/elements/LcarsText.vue";
import LcarsButton from "@/components/elements/LcarsButton.vue";

const { statusColor } = useLcarsColors();

withDefaults(
  defineProps<{
    outcome?: "Victory" | "Defeat";
    reason?: string;
    rating?: string;
    shipName?: string;
    captainName?: string;
  }>(),
  {
    outcome: "Victory",
    reason: "All Klingon forces destroyed.",
    rating: "Commander",
    shipName: "U.S.S. Enterprise NCC-1701-D",
    captainName: "James T. Kirk",
  }
);

const emit = defineEmits<{ (e: "new-game"): void }>();
</script>

<template>
  <LcarsWrapper
    id="rst-scr"
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
        :text="outcome"
        :color="
          outcome === 'Victory' ? 'text-light' : statusColor('critical', 'fg')
        "
      />
      <LcarsText
        :text="reason"
        color="text-light"
        :style="{ 'text-align': 'center' }"
      />
      <LcarsText :text="`Rating: ${rating}`" color="text-light" />
      <LcarsText :text="`${shipName} — Captain ${captainName}`" color="text-light" />
      <LcarsButton
        label="New Game"
        color="primary-interactive"
        :style="{ width: '12rem' }"
        @click="emit('new-game')"
      />
    </LcarsColumn>
  </LcarsWrapper>
</template>
