<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

export type LogCategory = "captain" | "general" | "engineering";

export interface CombatLogEntry {
  stardate: number;
  category: LogCategory;
  text: string;
}

const props = defineProps<{
  entries: CombatLogEntry[];
}>();

const logContent = ref<HTMLElement | null>(null);

watch(
  () => props.entries,
  () => {
    nextTick(() => {
      if (logContent.value) {
        logContent.value.scrollTop = logContent.value.scrollHeight;
      }
    });
  },
  { deep: true }
);
</script>

<template>
  <div ref="logContent" class="log-content text-light">
    <p v-for="(entry, i) in entries" :key="i" class="log-entry">
      <span class="log-stardate text-highlight"
        >[{{ entry.stardate.toFixed(1) }}]</span
      >
      {{ entry.text }}
    </p>
    <p v-if="entries.length === 0" class="log-entry log-empty">No entries.</p>
  </div>
</template>

<style scoped>
.log-content {
  width: 0;
  min-width: 100%;
  max-height: 7.5rem;
  box-sizing: border-box;
  padding: 0.5rem 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  font-family: "LCARS-Mono", monospace;
}

.log-entry {
  overflow-wrap: break-word;
  word-break: break-word;
  margin: 0 0 0.35rem 0;
}

.log-stardate {
  margin-right: 0.5rem;
}

.log-empty {
  opacity: 0.5;
}
</style>
