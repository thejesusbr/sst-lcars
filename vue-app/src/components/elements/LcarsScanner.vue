<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'

export interface ScannerCell {
  text?: string
  img?: string
  color?: string
  class?: string
  style?: Record<string, string>
}

export type GridDataType = Record<string, string | ScannerCell> | Array<Array<string | ScannerCell>>

const props = withDefaults(defineProps<{
  id?: string
  version?: 'short' | 'long'
  width?: number
  height?: number
  gridData?: GridDataType
  rowLabels?: string[]
  colLabels?: string[]
  coordsColor?: string
  style?: Record<string, string>
}>(), {
  id: undefined,
  version: 'short',
  width: 8,
  height: 8,
  gridData: () => ({}),
  rowLabels: undefined,
  colLabels: undefined,
  coordsColor: 'text-light',
  style: () => ({})
})

const emit = defineEmits<{
  'cell-click': [data: {
    row: number
    col: number
    isBorder: boolean
    label: string | null
    cellData: ScannerCell | null
    event: MouseEvent
  }]
}>()

const { register, unregister, generateId } = useLcarsRegistry()

const elementId = computed(() => props.id ?? generateId('scanner'))

const classes = computed(() => {
  const cls: Record<string, boolean> = {
    scanner: true
  }
  if (props.version) {
    cls[props.version] = true
  }
  return cls
})

const isBorderCell = (row: number, col: number): boolean => {
  return row === 0 || col === 0
}

const getBorderLabel = (row: number, col: number): string | null => {
  if (row === 0 && col === 0) return null
  if (row === 0 && col > 0) {
    if (props.colLabels && props.colLabels[col - 1] !== undefined) {
      return props.colLabels[col - 1]
    }
    return String(col)
  }
  if (row > 0 && col === 0) {
    if (props.rowLabels && props.rowLabels[row - 1] !== undefined) {
      return props.rowLabels[row - 1]
    }
    return String(row)
  }
  return null
}

const getCentralCellData = (row: number, col: number): ScannerCell | null => {
  if (!props.gridData) return null

  // 1. If gridData is an array (2D array)
  if (Array.isArray(props.gridData)) {
    const rIndex = row - 1
    const cIndex = col - 1
    if (props.gridData[rIndex] && props.gridData[rIndex][cIndex] !== undefined) {
      const val = props.gridData[rIndex][cIndex]
      if (typeof val === 'string') {
        return { text: val }
      }
      return val as ScannerCell
    }
    return null
  }

  // 2. If gridData is an object
  if (typeof props.gridData === 'object') {
    const keys = [
      `${row},${col}`,
      `${row}-${col}`,
      `X${row}Y${col}`,
      `i${row}j${col}`
    ]
    for (const key of keys) {
      if (props.gridData[key] !== undefined) {
        const val = props.gridData[key]
        if (typeof val === 'string') {
          return { text: val }
        }
        return val as ScannerCell
      }
    }
  }

  return null
}

const getCellClasses = (row: number, col: number) => {
  const isBorder = isBorderCell(row, col)
  const cls: Record<string, boolean> = {
    item: true,
    'coordinate-cell': isBorder,
    'central-cell': !isBorder
  }
  if (!isBorder) {
    const cellData = getCentralCellData(row, col)
    if (cellData) {
      if (cellData.color) {
        cls[cellData.color] = true
      }
      if (cellData.class) {
        cellData.class.split(' ').forEach((c) => {
          if (c.trim()) cls[c.trim()] = true
        })
      }
    }
  }
  return cls
}

const getCellStyles = (row: number, col: number): Record<string, string> => {
  const isBorder = isBorderCell(row, col)
  if (!isBorder) {
    const cellData = getCentralCellData(row, col)
    if (cellData && cellData.style) {
      return cellData.style
    }
  }
  return {}
}

const handleCellClick = (row: number, col: number, event: MouseEvent) => {
  const isBorder = isBorderCell(row, col)
  const label = isBorder ? getBorderLabel(row, col) : null
  const cellData = isBorder ? null : getCentralCellData(row, col)
  emit('cell-click', { row, col, isBorder, label, cellData, event })
}

onMounted(() => {
  register(elementId.value, null, { type: 'scanner', ...props })
})

onUnmounted(() => {
  unregister(elementId.value)
})
</script>

<template>
  <div :id="elementId" :class="classes" :style="style">
    <!-- Row loop: i from 0 to height -->
    <template v-for="i in height + 1" :key="`row-${i - 1}`">
      <!-- Col loop: j from 0 to width -->
      <div
        v-for="j in width + 1"
        :key="`cell-${i - 1}-${j - 1}`"
        :id="`${elementId}X${i - 1}Y${j - 1}`"
        :class="getCellClasses(i - 1, j - 1)"
        :style="getCellStyles(i - 1, j - 1)"
        @click="handleCellClick(i - 1, j - 1, $event)"
      >
        <slot
          name="cell"
          :row="i - 1"
          :col="j - 1"
          :isBorder="isBorderCell(i - 1, j - 1)"
          :label="getBorderLabel(i - 1, j - 1)"
          :cellData="getCentralCellData(i - 1, j - 1)"
        >
          <!-- Border cells coordinate display -->
          <span v-if="isBorderCell(i - 1, j - 1) && getBorderLabel(i - 1, j - 1) !== null" :class="coordsColor">
            {{ getBorderLabel(i - 1, j - 1) }}
          </span>
          <!-- Central cells content display -->
          <template v-else-if="!isBorderCell(i - 1, j - 1) && getCentralCellData(i - 1, j - 1)">
            <img
              v-if="getCentralCellData(i - 1, j - 1)?.img"
              :src="getCentralCellData(i - 1, j - 1)!.img"
              style="width: 90%; height: 90%; object-fit: contain; image-rendering: pixelated;"
            />
            <span
              v-if="getCentralCellData(i - 1, j - 1)?.text"
              :class="getCentralCellData(i - 1, j - 1)?.img ? 'scanner-cell-badge' : 'scanner-cell-text'"
            >
              {{ getCentralCellData(i - 1, j - 1)?.text }}
            </span>
          </template>
        </slot>
      </div>
    </template>
  </div>
</template>

<style scoped>
.scanner > .item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  font-family: "LCARS", sans-serif;
  font-weight: bold;
}

/* line-height global (1.25x) sobra espaco abaixo do glifo em fontes como
   "LCARS Lower" -- o texto fica visualmente colado no topo da celula mesmo
   com align-items:center no flex pai. line-height:1 aperta a caixa de linha
   ao redor do glifo de verdade, daí o align-items:center do flex funciona certo. */
.scanner-cell-text {
  line-height: 1;
}

/* Badge sobre um icone (ex: numero de tubo de torpedo mirando o alvo) */
.scanner-cell-badge {
  position: absolute;
  bottom: 1px;
  right: 1px;
  min-width: 1em;
  padding: 0 0.15em;
  background: #000;
  color: #fff;
  font-size: 0.65em;
  line-height: 1.3;
  text-align: center;
  border-radius: 2px;
}
</style>
