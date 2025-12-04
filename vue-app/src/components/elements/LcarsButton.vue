<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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
  toggle?: boolean
  toggleGroup?: string
  href?: string
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
  toggle: undefined,
  toggleGroup: undefined,
  href: undefined,
  style: () => ({})
})

const emit = defineEmits<{
  click: [event: MouseEvent]
  'update:toggle': [value: boolean]
}>()

const { register, unregister, generateId, addToToggleGroup, removeFromToggleGroup, getToggleGroup, setData } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('button'))
const isToggled = ref(props.toggle ?? false)

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    button: true
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
  if (isToggled.value) cls.toggle = true
  return cls
})

const handleClick = (event: MouseEvent) => {
  if (props.toggle !== undefined) {
    if (props.toggleGroup) {
      const group = getToggleGroup(props.toggleGroup)
      if (group) {
        group.forEach((id) => {
          if (id !== elementId.value) {
            setData(id, 'toggle', false)
          }
        })
      }
      isToggled.value = true
    } else {
      isToggled.value = !isToggled.value
    }
    emit('update:toggle', isToggled.value)
  }
  emit('click', event)
}

onMounted(() => {
  register(elementId.value, null, { type: 'button', ...props, toggle: isToggled.value })
  if (props.toggleGroup) {
    addToToggleGroup(props.toggleGroup, elementId.value)
  }
})

onUnmounted(() => {
  if (props.toggleGroup) {
    removeFromToggleGroup(props.toggleGroup, elementId.value)
  }
  unregister(elementId.value)
})
</script>

<template>
  <a
    v-if="href"
    :id="elementId"
    :class="classes"
    :href="href"
    :data-label="label"
    :data-alt-label="altLabel"
    :style="style"
    @click="handleClick"
  >
    <slot />
  </a>
  <div
    v-else
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
