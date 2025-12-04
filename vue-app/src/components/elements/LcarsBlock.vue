<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'

const props = withDefaults(defineProps<{
  id?: string
  color?: string
  label?: string
  altLabel?: string | number
  version?: string
  size?: string
  flex?: string
  flexc?: string
  hidden?: boolean
  disabled?: boolean
  noEvent?: boolean
  noTransition?: boolean
  style?: Record<string, string>
}>(), {
  id: undefined,
  color: undefined,
  label: undefined,
  altLabel: undefined,
  version: undefined,
  size: undefined,
  flex: undefined,
  flexc: undefined,
  hidden: false,
  disabled: false,
  noEvent: false,
  noTransition: false,
  style: () => ({})
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('block'))

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    block: true
  }
  if (props.color) cls[props.color] = true
  if (props.version) cls[props.version] = true
  if (props.size) cls[props.size] = true
  if (props.flex) cls[`flex-${props.flex}`] = true
  if (props.flexc) cls[`flex-c-${props.flexc}`] = true
  if (props.hidden) cls.hidden = true
  if (props.disabled) cls.disabled = true
  if (props.noEvent) cls['no-event'] = true
  if (props.noTransition) cls['no-transition'] = true
  return cls
})

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}

onMounted(() => {
  register(elementId.value, null, { type: 'block', ...props })
})

onUnmounted(() => {
  unregister(elementId.value)
})
</script>

<template>
  <div
    :id="elementId"
    :class="classes"
    :data-label="label"
    :data-alt-label="altLabel"
    :style="style"
    @click="handleClick"
  >
    <slot />
  </div>
</template>
