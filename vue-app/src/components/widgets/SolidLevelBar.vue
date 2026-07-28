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

// wrapper (bar + cap bg-white) tem a mesma largura/altura do container --
// deslocar por 100% (o que "${100-percentage}%" fazia) arrasta o cap junto
// pra fora da area visivel em 0%, deixando so vazio. O cap so deve
// desaparecer proporcionalmente ao esvaziar o BAR (calc(100% - 5px) em
// solid-level-bar.css, mesma constante aqui), nunca a largura toda do
// wrapper -- assim em 0% o cap fica parado na borda, visivel.
const wrapperShift = computed(() => {
  const value = Math.max(props.min, Math.min(props.max, currentLevel.value))
  const percentage = (value / props.max) * 100
  const emptyFraction = (100 - percentage) / 100
  return `(100% - 5px) * ${emptyFraction}`
})

const wrapperTransform = computed(() => {
  const shift = wrapperShift.value

  if (props.version === 'vertical') {
    if (props.reverse) {
      return `translateY(calc(-1 * (${shift})))`
    }
    return `translateY(calc(${shift}))`
  } else {
    if (props.reverse) {
      return `translateX(calc(${shift}))`
    }
    return `translateX(calc(-1 * (${shift})))`
  }
})

const displayLabel = computed(() => {
  if (props.label) return props.label
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
