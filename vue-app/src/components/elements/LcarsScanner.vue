<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useLcarsRegistry } from '@/composables/useLcarsRegistry'

export interface ScannerCell {
  text?: string
  img?: string
  color?: string
  class?: string
  style?: Record<string, string>
}

export type GridDataType = Record<string, string | ScannerCell> | Array<Array<string | ScannerCell>>

/**
 * Efeito transitório desenhado POR CIMA do grid, nunca dentro do `gridData`.
 *
 * A animação vive **entre** células (o feixe) e **através** delas (o asterisco
 * do torpedo), o que o modelo por célula não expressa; e escrever quadro de
 * animação no `gridData` apagaria o conteúdo real da célula na passagem.
 *
 * Coordenadas são de célula central, 1-based — as mesmas de `GridCoord`.
 */
export interface ScannerOverlay {
  /** `beam`: feixe pulsante. `travel`: asterisco percorrendo. `impact`: pulso no alvo. */
  kind: 'beam' | 'travel' | 'impact'
  from: { row: number; col: number }
  to: { row: number; col: number }
  /** Duração da animação, em ms. */
  durationMs: number
  /** Chave que força reinício da animação a cada evento novo. */
  key: string | number
  color?: string
}

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
  overlay?: ScannerOverlay | null
}>(), {
  id: undefined,
  version: 'short',
  width: 8,
  height: 8,
  gridData: () => ({}),
  rowLabels: undefined,
  colLabels: undefined,
  coordsColor: 'text-light',
  style: () => ({}),
  overlay: null
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

// ── Camada de overlay ──────────────────────────────────────────────────────

const containerRef = ref<HTMLElement | null>(null)
const boxSize = ref({ w: 0, h: 0 })

/**
 * Centro de uma célula em px, MEDIDO no DOM.
 *
 * O grid é flexbox com `space-evenly` e tamanhos em `rem` que mudam por versão
 * (short/long) e por tema — derivar a posição de constantes daria um número
 * certo hoje e errado no próximo ajuste de CSS. Medir é a única fonte que não
 * mente.
 *
 * **`offsetLeft`/`offsetTop`, NÃO `getBoundingClientRect()`.** O app inteiro
 * roda dentro de `.zoom-wrapper`, que aplica `transform: scale(0.8)`.
 * `getBoundingClientRect` devolve coordenada VISUAL, já multiplicada pela
 * escala; o SVG desenha esses números na unidade dele e **também** está dentro
 * do wrapper escalado, então levava 0.8 duas vezes. O efeito era um erro
 * proporcional à distância do canto do scanner — célula perto da origem quase
 * certa, célula longe muito errada. `offsetLeft` é coordenada de layout e
 * ignora transform, que é exatamente o espaço em que o SVG desenha.
 *
 * `.scanner` tem `position: relative` (ver `<style>` abaixo), então é o
 * `offsetParent` das células e o offset já é relativo a ele.
 */
const cellCenter = (row: number, col: number): { x: number; y: number } | null => {
  const el = containerRef.value
  if (!el) return null
  const cell = el.children[row * (props.width + 1) + col] as HTMLElement | undefined
  if (!cell) return null
  return {
    x: cell.offsetLeft + cell.offsetWidth / 2,
    y: cell.offsetTop + cell.offsetHeight / 2,
  }
}

const measure = () => {
  const el = containerRef.value
  if (!el) return
  // Mesmo espaço de coordenada do `cellCenter`: layout, não visual.
  boxSize.value = { w: el.offsetWidth, h: el.offsetHeight }
}

/** Geometria do overlay atual, em px do próprio scanner. */
const overlayGeom = computed(() => {
  const o = props.overlay
  if (!o || boxSize.value.w === 0) return null
  const from = cellCenter(o.from.row, o.from.col)
  const to = cellCenter(o.to.row, o.to.col)
  if (!from || !to) return null
  return { ...o, from, to, dur: `${o.durationMs}ms` }
})

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  register(elementId.value, null, { type: 'scanner', ...props })
  measure()
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(containerRef.value)
  }
})

// Overlay novo pode chegar antes de o layout assentar (ex.: console recém-montado).
watch(() => props.overlay?.key, () => nextTick(measure))

onUnmounted(() => {
  resizeObserver?.disconnect()
  unregister(elementId.value)
})
</script>

<template>
  <div ref="containerRef" :id="elementId" :class="classes" :style="style">
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

    <!-- Overlay transitório: fica FORA do fluxo das células e não intercepta
         clique, então o conteúdo real de cada célula segue intacto e clicável
         mesmo durante a animação. -->
    <svg
      v-if="overlayGeom"
      :key="overlayGeom.key"
      class="scanner-overlay"
      :width="boxSize.w"
      :height="boxSize.h"
    >
      <line
        v-if="overlayGeom.kind === 'beam'"
        class="scanner-beam"
        :x1="overlayGeom.from.x"
        :y1="overlayGeom.from.y"
        :x2="overlayGeom.to.x"
        :y2="overlayGeom.to.y"
        :stroke="overlayGeom.color ?? 'currentColor'"
        :style="{ animationDuration: overlayGeom.dur }"
      />

      <!-- Asterisco percorrendo as células até o alvo. SMIL em vez de timer em
           JS: quem move é o navegador, então não há relógio novo pra
           dessincronizar com a fila da store. -->
      <text
        v-else-if="overlayGeom.kind === 'travel'"
        class="scanner-torpedo"
        :fill="overlayGeom.color ?? 'currentColor'"
        text-anchor="middle"
        dominant-baseline="central"
      >
        *
        <animate
          attributeName="x"
          :from="overlayGeom.from.x"
          :to="overlayGeom.to.x"
          :dur="overlayGeom.dur"
          fill="freeze"
        />
        <animate
          attributeName="y"
          :from="overlayGeom.from.y"
          :to="overlayGeom.to.y"
          :dur="overlayGeom.dur"
          fill="freeze"
        />
      </text>

      <circle
        v-else
        class="scanner-impact"
        :cx="overlayGeom.to.x"
        :cy="overlayGeom.to.y"
        r="12"
        fill="none"
        :stroke="overlayGeom.color ?? 'currentColor'"
        :style="{ animationDuration: overlayGeom.dur }"
      />
    </svg>
  </div>
</template>

<style scoped>
/* O overlay é posicionado em relação ao scanner. O global `.scanner` não define
   `position`, então sem isto o SVG ancoraria no primeiro ancestral posicionado
   e a animação apareceria fora do grid. */
.scanner {
  position: relative;
}

.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: visible;
  color: var(--red-alert, #ff4d4d);
}

.scanner-beam {
  stroke-width: 2;
  stroke-linecap: round;
  animation-name: scanner-beam-pulse;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes scanner-beam-pulse {
  0%,
  100% {
    stroke-opacity: 0.25;
    stroke-width: 1;
  }
  50% {
    stroke-opacity: 1;
    stroke-width: 3;
  }
}

.scanner-torpedo {
  font-family: "LCARS", monospace;
  font-size: 1.1rem;
  font-weight: bold;
}

.scanner-impact {
  stroke-width: 2;
  animation-name: scanner-impact-ring;
  animation-timing-function: ease-out;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
}

@keyframes scanner-impact-ring {
  from {
    r: 3;
    stroke-opacity: 1;
  }
  to {
    r: 18;
    stroke-opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scanner-beam,
  .scanner-impact {
    animation: none;
    stroke-opacity: 0.9;
  }
}

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
