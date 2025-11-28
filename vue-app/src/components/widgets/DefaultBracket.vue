<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'
import LcarsWrapper from '@/components/elements/LcarsWrapper.vue'
import LcarsElbow from '@/components/elements/LcarsElbow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsBar from '@/components/elements/LcarsBar.vue'
import type { LcarsBracketColoring } from '@/types/lcars'

const props = withDefaults(defineProps<{
  id?: string
  coloring?: LcarsBracketColoring
  hidden?: boolean
  noEvent?: boolean
  style?: Record<string, string>
}>(), {
  id: undefined,
  coloring: undefined,
  hidden: false,
  noEvent: false,
  style: () => ({})
})

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('defaultBracket'))

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    sdk: true,
    'default-bracket': true
  }
  if (props.hidden) cls.hidden = true
  if (props.noEvent) cls['no-event'] = true
  return cls
})

const elbowColor = computed(() => props.coloring?.elbow ?? 'bg-')
const animatedColor = computed(() => props.coloring?.animated ?? 'bg-white')
const column1Colors = computed(() => props.coloring?.column1 ?? ['bg-', 'bg-', 'bg-'])
const column2Colors = computed(() => props.coloring?.column2 ?? ['bg-', 'bg-', 'bg-'])
const column3Colors = computed(() => props.coloring?.column3 ?? ['bg-', 'bg-', 'bg-'])
const column4Colors = computed(() => props.coloring?.column4 ?? ['bg-', 'bg-', 'bg-'])

onMounted(() => {
  register(elementId.value, null, { type: 'defaultBracket', namespace: 'sdk', ...props })
})

onUnmounted(() => {
  unregister(elementId.value)
})
</script>

<template>
  <div
    :id="elementId"
    :class="classes"
    :style="style"
  >
    <LcarsWrapper class="content">
      <slot />
    </LcarsWrapper>
    
    <LcarsElbow direction="top-left" version="horizontal" size="small" :color="elbowColor" no-event>
      <LcarsBar />
    </LcarsElbow>
    
    <LcarsElbow direction="top-right" version="horizontal" size="small" :color="elbowColor" no-event>
      <LcarsBar />
    </LcarsElbow>
    
    <LcarsElbow direction="bottom-left" version="horizontal" size="small" :color="elbowColor" no-event>
      <LcarsBar />
    </LcarsElbow>
    
    <LcarsElbow direction="bottom-right" version="horizontal" size="small" :color="elbowColor" no-event>
      <LcarsBar />
    </LcarsElbow>
    
    <LcarsColumn flex="v">
      <LcarsBar flexc="v" :color="column1Colors[0]" />
      <LcarsBar flexc="v" :color="column1Colors[1]">
        <LcarsBar class="animated" :color="animatedColor" />
      </LcarsBar>
      <LcarsBar flexc="v" :color="column1Colors[2]" />
    </LcarsColumn>
    
    <LcarsColumn flex="v">
      <LcarsBar flexc="v" :color="column2Colors[0]" />
      <LcarsBar flexc="v" :color="column2Colors[1]" />
      <LcarsBar flexc="v" :color="column2Colors[2]" />
    </LcarsColumn>
    
    <LcarsColumn flex="v">
      <LcarsBar flexc="v" :color="column3Colors[0]" />
      <LcarsBar flexc="v" :color="column3Colors[1]">
        <LcarsBar class="animated" :color="animatedColor" />
      </LcarsBar>
      <LcarsBar flexc="v" :color="column3Colors[2]" />
    </LcarsColumn>
    
    <LcarsColumn flex="v">
      <LcarsBar flexc="v" :color="column4Colors[0]" />
      <LcarsBar flexc="v" :color="column4Colors[1]" />
      <LcarsBar flexc="v" :color="column4Colors[2]" />
    </LcarsColumn>
  </div>
</template>
