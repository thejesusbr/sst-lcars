<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'

const props = withDefaults(defineProps<{
  id?: string
  color?: string
  version?: string
  flex?: string
  flexc?: string
  hidden?: boolean
  noEvent?: boolean
  style?: Record<string, string>
}>(), {
  id: undefined,
  color: undefined,
  version: undefined,
  flex: undefined,
  flexc: undefined,
  hidden: false,
  noEvent: false,
  style: () => ({})
})

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('wrapper'))

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    wrapper: true
  }
  if (props.color) cls[props.color] = true
  if (props.version) cls[props.version] = true
  if (props.flex) cls[`flex-${props.flex}`] = true
  if (props.flexc) cls[`flex-c-${props.flexc}`] = true
  if (props.hidden) cls.hidden = true
  if (props.noEvent) cls['no-event'] = true
  return cls
})

onMounted(() => {
  register(elementId.value, null, { type: 'wrapper', ...props })
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
    <slot />
  </div>
</template>
