<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { useLcarsRegistry } from "@/composables/useLcarsRegistry";
import LcarsCap from "@/components/elements/LcarsCap.vue";
import LcarsRow from "@/components/elements/LcarsRow.vue";
import LcarsBar from "@/components/elements/LcarsBar.vue";
import LcarsTitle from "@/components/elements/LcarsTitle.vue";
import type { LcarsBarFrameColoring } from "@/types/lcars";

const props = withDefaults(
  defineProps<{
    id?: string;
    reverse?: boolean;
    label?: string;
    altLabel?: string;
    coloring?: LcarsBarFrameColoring;
    hidden?: boolean;
    noEvent?: boolean;
    style?: Record<string, string>;
  }>(),
  {
    id: undefined,
    reverse: false,
    label: undefined,
    altLabel: undefined,
    coloring: undefined,
    hidden: false,
    noEvent: false,
    style: () => ({}),
  }
);

const { register, unregister, generateId } = useLcarsRegistry();

const elementId = computed(() => props.id ?? generateId("defaultBarFrame"));

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    sdk: true,
    "default-bar-frame": true,
  };
  if (props.reverse) cls.reverse = true;
  if (props.hidden) cls.hidden = true;
  if (props.noEvent) cls["no-event"] = true;
  return cls;
});

onMounted(() => {
  register(elementId.value, null, {
    type: "defaultBarFrame",
    namespace: "sdk",
    ...props,
  });
});

onUnmounted(() => {
  unregister(elementId.value);
});
</script>

<template>
  <div :id="elementId" :class="classes" :style="style">
    <!-- Header -->
    <header class="row">
      <LcarsCap
        version="round-left"
        :color="coloring?.headerCapLeft || 'primary-static'"
        no-event
      />

      <!-- Reverse Header layout -->
      <LcarsRow v-if="reverse" flexc="h">
        <div class="header-controls-before">
          <slot name="header-controls-before" />
        </div>
        <LcarsBar flexc="h" :color="coloring?.headerBar || 'bg-'" no-event />
        <div class="header-controls-after">
          <slot name="header-controls-after" />
        </div>
        <LcarsTitle
          v-if="label !== undefined && label !== null && label !== ''"
          :text="label"
          :color="coloring?.headerTitle || 'text-light'"
          no-event
        />
      </LcarsRow>

      <!-- Default Header layout -->
      <LcarsRow v-else flexc="h">
        <LcarsTitle
          v-if="label !== undefined && label !== null && label !== ''"
          :text="label"
          :color="coloring?.headerTitle || 'text-light'"
          no-event
        />
        <div class="header-controls-before">
          <slot name="header-controls-before" />
        </div>
        <LcarsBar flexc="h" :color="coloring?.headerBar || 'bg-'" no-event />
        <div class="header-controls-after">
          <slot name="header-controls-after" />
        </div>
      </LcarsRow>

      <LcarsCap
        version="round-right"
        :color="coloring?.headerCapRight || 'bg-'"
        no-event
      />
    </header>

    <!-- Content area -->
    <div class="content">
      <slot />
    </div>

    <!-- Footer -->
    <footer class="row">
      <LcarsCap
        version="round-left"
        :color="coloring?.footerCapLeft || 'primary-static'"
        no-event
      />

      <!-- Reverse Footer layout -->
      <LcarsRow v-if="reverse" flexc="h">
        <LcarsTitle
          v-if="altLabel !== undefined && altLabel !== null && altLabel !== ''"
          :text="altLabel"
          :color="coloring?.footerTitle || 'text-light'"
          no-event
        />
        <div class="footer-controls-before">
          <slot name="footer-controls-before" />
        </div>
        <LcarsBar
          flexc="h"
          :color="coloring?.footerBar || 'primary-static'"
          no-event
        />
        <div class="footer-controls-after">
          <slot name="footer-controls-after" />
        </div>
      </LcarsRow>

      <!-- Default Footer layout -->
      <LcarsRow v-else flexc="h">
        <div class="footer-controls-before">
          <slot name="footer-controls-before" />
        </div>
        <LcarsBar
          flexc="h"
          :color="coloring?.footerBar || 'primary-static'"
          no-event
        />
        <div class="footer-controls-after">
          <slot name="footer-controls-after" />
        </div>
        <LcarsTitle
          v-if="altLabel !== undefined && altLabel !== null && altLabel !== ''"
          :text="altLabel"
          :color="coloring?.footerTitle || 'text-light'"
          no-event
        />
      </LcarsRow>

      <LcarsCap
        version="round-right"
        :color="coloring?.footerCapRight || 'primary-static'"
        no-event
      />
    </footer>
  </div>
</template>
