<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'

const props = withDefaults(defineProps<{
  id?: string
  tag?: string
  color?: string
  flex?: string
  flexc?: string
  hidden?: boolean
  noEvent?: boolean
  style?: Record<string, string>
}>(), {
  id: undefined,
  tag: 'div',
  color: undefined,
  flex: undefined,
  flexc: undefined,
  hidden: false,
  noEvent: false,
  style: () => ({})
})

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('htmlTag'))

const classes = computed(() => {
  const cls: Record<string, boolean> = {}
  if (props.color) cls[props.color] = true
  if (props.flex) cls[`flex-${props.flex}`] = true
  if (props.flexc) cls[`flex-c-${props.flexc}`] = true
  if (props.hidden) cls.hidden = true
  if (props.noEvent) cls['no-event'] = true
  return cls
})

onMounted(() => {
  register(elementId.value, null, { type: 'htmlTag', ...props })
})

onUnmounted(() => {
  unregister(elementId.value)
})
</script>

<template>
  <component
    :is="tag"
    :id="elementId"
    :class="classes"
    :style="style"
  >
    <slot />
  </component>
</template>
