<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useLcarsColors } from '@/composables/useLcarsColors'
import DefaultBarFrame from '@/components/widgets/DefaultBarFrame.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'

type LogCategory = 'captain' | 'general' | 'engineering'

interface CombatLogEntry {
  stardate: number
  category: LogCategory
  text: string
}

const { randColor } = useLcarsColors()

const activeTab = ref<LogCategory>('general')

const toggleTab = (tab: LogCategory) => {
  activeTab.value = tab
}

const entries = ref<CombatLogEntry[]>([
  { stardate: 3600.1, category: 'general', text: '*** RED ALERT *** Klingons in this quadrant!' },
  { stardate: 3600.2, category: 'engineering', text: 'Shields absorb 340 units.' },
  { stardate: 3600.3, category: 'captain', text: 'Captain\'s Log: entering hostile quadrant 3,4.' },
  { stardate: 3600.4, category: 'general', text: '*** KLINGON DESTROYED ***' },
  { stardate: 3600.5, category: 'engineering', text: 'Warp Core overload at 12%. Damage control team dispatched.' },
])

const filteredEntries = computed(() =>
  entries.value.filter((entry) => entry.category === activeTab.value)
)

const logContent = ref<HTMLElement | null>(null)

watch(entries, () => {
  nextTick(() => {
    if (logContent.value) {
      logContent.value.scrollTop = logContent.value.scrollHeight
    }
  })
}, { deep: true })
</script>

<template>
  <div class="combat-log-wrapper">
  <DefaultBarFrame
    id="cbt-log"
    label="Combat Log"
    :coloring="{ headerTitle: 'text-white' }"
    :style="{
      height: '12rem',
      flex: 'none',
    }"
  >
    <template #header-controls-before>
      <LcarsButton
        label="Captain's Log"
        :color="activeTab === 'captain' ? 'bg-orange-2' : randColor()"
        :style="{ width: '9rem' }"
        @click="toggleTab('captain')"
      />
      <LcarsButton
        label="General"
        :color="activeTab === 'general' ? 'bg-orange-2' : randColor()"
        :style="{ width: '7rem' }"
        @click="toggleTab('general')"
      />
      <LcarsButton
        label="Engineering"
        :color="activeTab === 'engineering' ? 'bg-orange-2' : randColor()"
        :style="{ width: '8rem' }"
        @click="toggleTab('engineering')"
      />
    </template>

    <div ref="logContent" class="log-content">
      <p v-for="(entry, i) in filteredEntries" :key="i" class="log-entry">
        <span class="log-stardate">[{{ entry.stardate.toFixed(1) }}]</span> {{ entry.text }}
      </p>
      <p v-if="filteredEntries.length === 0" class="log-entry log-empty">No entries.</p>
    </div>
  </DefaultBarFrame>
  </div>
</template>

<style scoped>
/* DefaultBarFrame nao restringe a altura de header/.content/footer (so define
   padding no .content) -- sem isso o log cresce e vaza pra fora do frame fixo. */
.combat-log-wrapper :deep(#cbt-log) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.combat-log-wrapper :deep(#cbt-log > .content) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.log-content {
  height: 100%;
  overflow-y: auto;
  font-family: 'LCARS-Mono', monospace;
  color: #fff;
}

.log-entry {
  margin: 0 0 0.35rem 0;
}

.log-stardate {
  color: #ff9900;
  margin-right: 0.5rem;
}

.log-empty {
  opacity: 0.5;
}
</style>
