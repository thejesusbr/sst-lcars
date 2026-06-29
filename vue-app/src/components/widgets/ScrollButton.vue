<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'
import LcarsButton from '@/components/elements/LcarsButton.vue'

const props = withDefaults(defineProps<{
  id?: string
  target: string
  version?: 'vertical' | 'horizontal'
  reverse?: boolean
  color?: string
  amount?: number
  page?: number
  hidden?: boolean
  style?: Record<string, string>
}>(), {
  id: undefined,
  version: 'vertical',
  reverse: false,
  color: undefined,
  amount: undefined,
  page: undefined,
  hidden: false,
  style: () => ({})
})

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('scrollButton'))

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    sdk: true,
    'scroll-button': true
  }
  if (props.version) cls[props.version] = true
  if (props.reverse) cls.reverse = true
  if (props.hidden) cls.hidden = true
  return cls
})

const getTargetElement = () => {
  if (!props.target) return null
  return document.querySelector(props.target)
}

const scrollUp = () => {
  const el = getTargetElement()
  if (!el) return
  const scrollVal = el.scrollTop
  let scrollAmount = props.amount ?? 60
  if (props.page !== undefined && props.page !== null) {
    scrollAmount = el.clientHeight * props.page
  }
  el.scrollTop = scrollVal - scrollAmount
}

const scrollDown = () => {
  const el = getTargetElement()
  if (!el) return
  const scrollVal = el.scrollTop
  let scrollAmount = props.amount ?? 60
  if (props.page !== undefined && props.page !== null) {
    scrollAmount = el.clientHeight * props.page
  }
  el.scrollTop = scrollVal + scrollAmount
}

const scrollLeft = () => {
  const el = getTargetElement()
  if (!el) return
  const scrollVal = el.scrollLeft
  let scrollAmount = props.amount ?? 60
  if (props.page !== undefined && props.page !== null) {
    scrollAmount = el.clientWidth * props.page
  }
  el.scrollLeft = scrollVal - scrollAmount
}

const scrollRight = () => {
  const el = getTargetElement()
  if (!el) return
  const scrollVal = el.scrollLeft
  let scrollAmount = props.amount ?? 60
  if (props.page !== undefined && props.page !== null) {
    scrollAmount = el.clientWidth * props.page
  }
  el.scrollLeft = scrollVal + scrollAmount
}

onMounted(() => {
  register(elementId.value, null, { type: 'scrollButton', namespace: 'sdk', ...props })
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
    <template v-if="version === 'vertical'">
      <LcarsButton
        class="scroll-up"
        label="▲"
        :color="color"
        @click="scrollUp"
      />
      <LcarsButton
        class="scroll-down"
        alt-label="▼"
        :color="color"
        @click="scrollDown"
      />
    </template>
    <template v-else-if="version === 'horizontal'">
      <LcarsButton
        class="scroll-left"
        label="◀"
        :color="color"
        @click="scrollLeft"
      />
      <LcarsButton
        class="scroll-right"
        label="▶"
        :color="color"
        @click="scrollRight"
      />
    </template>
  </div>
</template>
