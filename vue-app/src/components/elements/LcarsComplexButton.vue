<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'

const props = withDefaults(defineProps<{
  id?: string
  color?: string
  size?: string
  version?: string
  flex?: string
  flexc?: string
  hidden?: boolean
  noEvent?: boolean
  style?: Record<string, string>
}>(), {
  id: undefined,
  color: undefined,
  size: undefined,
  version: undefined,
  flex: undefined,
  flexc: undefined,
  hidden: false,
  noEvent: false,
  style: () => ({})
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('complexButton'))

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    'complex-button': true
  }
  if (props.color) cls[props.color] = true
  if (props.size) cls[props.size] = true
  if (props.version) cls[props.version] = true
  if (props.flex) cls[`flex-${props.flex}`] = true
  if (props.flexc) cls[`flex-c-${props.flexc}`] = true
  if (props.hidden) cls.hidden = true
  if (props.noEvent) cls['no-event'] = true
  return cls
})

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}

onMounted(() => {
  register(elementId.value, null, { type: 'complexButton', ...props })
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
    @click="handleClick"
  >
    <slot />
  </div>
</template>
