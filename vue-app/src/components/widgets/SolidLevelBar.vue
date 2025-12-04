<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'
import LcarsWrapper from '@/components/elements/LcarsWrapper.vue'
import LcarsBar from '@/components/elements/LcarsBar.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'

const props = withDefaults(defineProps<{
  id?: string
  color?: string
  version?: string
  level?: number
  min?: number
  max?: number
  label?: string
  altLabel?: string | number
  reverse?: boolean
  hidden?: boolean
  noEvent?: boolean
  style?: Record<string, string>
}>(), {
  id: undefined,
  color: undefined,
  version: 'horizontal',
  level: 0,
  min: 0,
  max: 100,
  label: undefined,
  altLabel: undefined,
  reverse: false,
  hidden: false,
  noEvent: false,
  style: () => ({})
})

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('solidLevelBar'))
const currentLevel = ref(props.level)

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    sdk: true,
    'solid-level-bar': true
  }
  if (props.version) cls[props.version] = true
  if (props.hidden) cls.hidden = true
  if (props.noEvent) cls['no-event'] = true
  return cls
})

const wrapperTransform = computed(() => {
  const value = Math.max(props.min, Math.min(props.max, currentLevel.value))
  const percentage = (value / props.max) * 100

  if (props.version === 'vertical') {
    if (props.reverse) {
      return `translateY(-${100 - percentage}%)`
    }
    return `translateY(${100 - percentage}%)`
  } else {
    if (props.reverse) {
      return `translateX(${100 - percentage}%)`
    }
    return `translateX(-${100 - percentage}%)`
  }
})

const displayLabel = computed(() => {
  if (props.label) return currentLevel.value.toString()
  if (props.altLabel !== undefined) return currentLevel.value
  return undefined
})

watch(() => props.level, (newLevel) => {
  currentLevel.value = newLevel
})

onMounted(() => {
  register(elementId.value, null, { type: 'solidLevelBar', namespace: 'sdk', ...props })
})

onUnmounted(() => {
  unregister(elementId.value)
})

defineExpose({
  setLevel: (value: number) => {
    currentLevel.value = value
  }
})
</script>

<template>
  <div
    :id="elementId"
    :class="classes"
    :data-label="displayLabel"
    :data-alt-label="altLabel"
    :style="style"
  >
    <LcarsWrapper :style="{ transform: wrapperTransform }">
      <LcarsBar :color="color" />
      <LcarsCap color="bg-white" />
    </LcarsWrapper>
  </div>
</template>
