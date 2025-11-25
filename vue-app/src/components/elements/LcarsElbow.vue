<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'
import LcarsBar from './LcarsBar.vue'
import LcarsBlock from './LcarsBlock.vue'

const props = withDefaults(defineProps<{
  id?: string
  color?: string
  size?: string
  version?: string
  direction?: string
  flex?: string
  flexc?: string
  hidden?: boolean
  noEvent?: boolean
  style?: Record<string, string>
}>(), {
  id: undefined,
  color: undefined,
  size: 'default',
  version: 'horizontal',
  direction: 'bottom-left',
  flex: undefined,
  flexc: undefined,
  hidden: false,
  noEvent: false,
  style: () => ({})
})

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('elbow'))

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    elbow: true
  }
  if (props.color) cls[props.color] = true
  if (props.size) cls[props.size] = true
  if (props.version) cls[props.version] = true
  if (props.direction) {
    props.direction.split(' ').forEach(d => {
      cls[d] = true
    })
  }
  if (props.flex) cls[`flex-${props.flex}`] = true
  if (props.flexc) cls[`flex-c-${props.flexc}`] = true
  if (props.hidden) cls.hidden = true
  if (props.noEvent) cls['no-event'] = true
  return cls
})

onMounted(() => {
  register(elementId.value, null, { type: 'elbow', ...props })
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
    <LcarsBar>
      <LcarsBlock />
    </LcarsBar>
    <slot />
  </div>
</template>
