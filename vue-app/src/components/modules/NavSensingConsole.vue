<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLcarsColors } from '@/composables/useLcarsColors'
import { useScannerIcons, ScannerEntity } from '@/composables/useScannerIcons'
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'
import LcarsScanner, { type ScannerCell } from '@/components/elements/LcarsScanner.vue'
import DefaultBracket from '@/components/widgets/DefaultBracket.vue'
import LcarsComplexButton from '@/components/elements/LcarsComplexButton.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'
import LcarsText from '@/components/elements/LcarsText.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'

const props = withDefaults(defineProps<{
  shortRangeGrid?: Record<string, ScannerCell>
}>(), {
  shortRangeGrid: undefined,
})

const { randColor } = useLcarsColors()
const { getIcon, getRandomPlanet } = useScannerIcons()

const selectedSector = ref('3,4')
const selectedSystem = ref('3,4')
const remainingProbes = ref(3)
const probeStatus = ref<'Offline' | 'Active'>('Offline')

// Demo grid: called once at setup so the random planet stays stable
const demoShortRangeGrid: Record<string, ScannerCell> = {
  '4,4': { img: getIcon(ScannerEntity.PLAYER) },
  '2,3': { img: getRandomPlanet() },
  '6,6': { img: getIcon(ScannerEntity.STARBASE_DOCK) },
  '3,6': { img: getIcon(ScannerEntity.KLINGON_CRUISER) },
  '5,2': { img: getIcon(ScannerEntity.ROMULAN_WARBIRD) },
  '7,5': { text: '★', color: 'golden-tanoi-fg' },
}

const activeShortRangeGrid = ref<Record<string, ScannerCell>>(
  props.shortRangeGrid ?? demoShortRangeGrid
)

// Codigo LRS: KBS (Klingons/Bases/Stars, ver SST_LCARS_SPECS.md 2.1). Cor
// deriva do conteudo, nao e fixada por celula: inimigo (K>0) chama mais
// atencao que base aliada (B>0); sem nenhum dos dois, so estrelas, nada de
// interesse -- branco neutro.
const lrsCodeColor = (code: string) => {
  const klingons = Number(code[0] ?? 0)
  const bases = Number(code[1] ?? 0)
  if (klingons > 0) return 'alert-fg'
  if (bases > 0) return 'anakiwa-fg'
  return 'text-white'
}

// LRS classico so cobre os quadrantes VIZINHOS (bloco 3x3 ao redor da nave)
// e nao tem memoria -- some de novo ate o proximo Scan. Isso que o distingue
// do Star Chart (COM 4, StarChartConsole.vue), que e o mapa acumulado de tudo
// ja explorado na galaxia inteira e nao precisa ser re-escaneado. Grid
// continua 8x8 cheio (mesmo tamanho/posicoes absolutas do Star Chart) pra
// nao quebrar a mecanica de clicar no sistema e mandar a coordenada real pro
// Helm -- so os 9 quadrantes vizinhos tem dado, o resto fica em branco.
// Ver SST_LCARS_SPECS.md 3.2/5.2/12.7.
const playerQuadrant = ref({ row: 4, col: 4 })
const longRangeScanned = ref(false)

// Moldura na celula da posicao atual da nave -- so a nave sempre sabe onde
// ela esta, isso nao depende do Scan revelar o conteudo dos vizinhos.
const PLAYER_MARKER_STYLE = { boxShadow: 'inset 0 0 0 3px #ffffff' }

// Codigos por quadrante absoluto (galaxia 1-8x1-8), so os vizinhos do
// jogador tem entrada aqui -- o resto da galaxia esta fora do alcance do LRS.
const LRS_DEMO_CODES: Record<string, string> = {
  '3,3': '000',
  '3,4': '104',
  '4,3': '012',
  '4,4': '003',
  '4,5': '001',
  '5,4': '201',
  '5,5': '000',
}

const longRangeGrid = computed(() => {
  const grid: Record<string, ScannerCell> = {}
  if (longRangeScanned.value) {
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        const absRow = playerQuadrant.value.row + dRow
        const absCol = playerQuadrant.value.col + dCol
        if (absRow < 1 || absRow > 8 || absCol < 1 || absCol > 8) continue
        const code = LRS_DEMO_CODES[`${absRow},${absCol}`]
        if (!code) continue
        grid[`${absRow},${absCol}`] = { text: code, color: lrsCodeColor(code) }
      }
    }
  }
  const playerKey = `${playerQuadrant.value.row},${playerQuadrant.value.col}`
  grid[playerKey] = { ...grid[playerKey], style: PLAYER_MARKER_STYLE }
  return grid
})

const handleShortRangeCellClick = (data: {
  row: number
  col: number
  isBorder: boolean
  label: string | null
  cellData: ScannerCell | null
  event: MouseEvent
}) => {
  if (!data.isBorder) {
    selectedSector.value = `${data.row},${data.col}`
  }
}

const handleLongRangeCellClick = (data: {
  row: number
  col: number
  isBorder: boolean
  label: string | null
  cellData: ScannerCell | null
  event: MouseEvent
}) => {
  if (!data.isBorder) {
    selectedSystem.value = `${data.row},${data.col}`
  }
}

const sendToHelm = () => {
  console.log(`Sending sector ${selectedSector.value} to Helm`)
}

const hail = () => {
  console.log('Hailing target...')
}

const dock = () => {
  console.log('Initiating docking sequence...')
}

const sendParty = () => {
  console.log('Sending landing party...')
}

const scanLongRange = () => {
  longRangeScanned.value = true
}

const sendSystemToHelm = () => {
  console.log(`Sending system ${selectedSystem.value} to Helm`)
}

const sendProbe = () => {
  if (remainingProbes.value > 0 && probeStatus.value === 'Offline') {
    probeStatus.value = 'Active'
    remainingProbes.value -= 1
    setTimeout(() => {
      probeStatus.value = 'Offline'
    }, 2000)
  }
}
</script>

<template>
  <LcarsRow id="nav-cns-dsp" flexc="h" :style="{ 'justify-content': 'space-evenly' }">
    <!-- Short-range scanner column -->
    <LcarsColumn id="shr-scn-pnl" flex="v" :style="{ 'justify-content': 'center', 'align-items': 'center', 'gap': '1rem' }">
      <LcarsTitle version="centered" size="small" text="Short-range scanner" color="text-white" />
      <LcarsRow :style="{ 'justify-content': 'center' }">
        <DefaultBracket
          id="shr-scn-vwr"
          :style="{ height: '21rem', width: '24rem' }"
          :coloring="{
            elbow: 'tertiary-static',
            column1: ['primary-static', 'tertiary-static', 'primary-static'],
            column2: ['secondary-static', 'tertiary-static', 'secondary-static'],
            column3: ['primary-static', 'tertiary-static', 'primary-static'],
            column4: ['secondary-static', 'tertiary-static', 'secondary-static'],
            animated: 'pale-canary-bg'
          }"
        >
          <LcarsScanner
            id="shtRngScn"
            version="short"
            :width="8"
            :height="8"
            :grid-data="activeShortRangeGrid"
            @cell-click="handleShortRangeCellClick"
          />
        </DefaultBracket>
      </LcarsRow>

      <!-- Selected Sector Complex Button -->
      <LcarsComplexButton id="snd-hlm-sec" :color="randColor()" :style="{ width: '24rem', flex: 'none' }">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Selected sector" :style="{ width: '10rem' }" />
        <LcarsText id="snd-hlm-sec-txt" :text="selectedSector" :style="{ width: '4rem', 'text-align': 'center' }" />
        <LcarsBlock version="decorator" :style="{ width: '2rem' }" />
        <LcarsButton
          id="tpd-tgt-cyc-tb1"
          version="round"
          :color="randColor()"
          label="Snd Helm"
          :style="{ width: '8rem' }"
          @click="sendToHelm"
        />
      </LcarsComplexButton>

      <!-- Auxiliary controls -->
      <LcarsRow :style="{ 'justify-content': 'space-evenly', width: '24rem' }">
        <LcarsButton
          id="hal-btn"
          version="round"
          :color="randColor()"
          label="Hail"
          :style="{ width: '7rem' }"
          @click="hail"
        />
        <LcarsButton
          id="dck-btn"
          version="round"
          :color="randColor()"
          label="Dock"
          :style="{ width: '7rem' }"
          @click="dock"
        />
        <LcarsButton
          id="snd-prt-btn"
          version="round"
          :color="randColor()"
          label="Snd Party"
          :style="{ width: '8rem' }"
          @click="sendParty"
        />
      </LcarsRow>
    </LcarsColumn>

    <!-- Long-range scanner column -->
    <LcarsColumn id="lgrScPnl" flex="v" :style="{ 'justify-content': 'center', 'align-items': 'center', 'gap': '1rem' }">
      <LcarsTitle version="centered" size="small" text="Long range scanner" color="text-white" />
      <LcarsRow :style="{ 'justify-content': 'center' }">
        <DefaultBracket
          id="lgrScnVwr"
          :style="{ height: '21rem', width: '42rem' }"
          :coloring="{
            elbow: 'tertiary-static',
            column1: ['primary-static', 'tertiary-static', 'primary-static'],
            column2: ['secondary-static', 'tertiary-static', 'secondary-static'],
            column3: ['primary-static', 'tertiary-static', 'primary-static'],
            column4: ['secondary-static', 'tertiary-static', 'secondary-static'],
            animated: 'pale-canary-bg'
          }"
        >
          <LcarsScanner
            id="lngRngScn"
            version="long"
            :width="8"
            :height="8"
            :grid-data="longRangeGrid"
            @cell-click="handleLongRangeCellClick"
          />
        </DefaultBracket>
      </LcarsRow>

      <!-- LRS code legend -->
      <LcarsText
        text="Code: KBS — K=Klingons  B=Starbases  S=Stars"
        color="text-white"
        :style="{
          width: '42rem',
          textAlign: 'center',
          fontSize: '1.15rem',
          opacity: '0.75',
        }"
      />

      <!-- Controls row: Scan, Selected System, Snd to Helm -->
      <LcarsRow :style="{ 'justify-content': 'space-evenly', width: '42rem' }">
        <LcarsButton
          id="lngScnBtn"
          version="round"
          label="Scan"
          :color="randColor()"
          :style="{ width: '8rem' }"
          @click="scanLongRange"
        />
        <LcarsComplexButton :color="randColor()" :style="{ width: '22rem' }">
          <LcarsCap version="round-left" />
          <LcarsBlock label="Selected System" :style="{ width: '12rem' }" />
          <LcarsText id="sndHlmSysTxt" :text="selectedSystem" :style="{ width: '4rem', 'text-align': 'center' }" />
          <LcarsBlock version="decorator" :style="{ width: '4rem' }" />
        </LcarsComplexButton>
        <LcarsButton
          id="sndSysHlm"
          version="round"
          :color="randColor()"
          label="Snd to Helm"
          :style="{ width: '10rem' }"
          @click="sendSystemToHelm"
        />
      </LcarsRow>

      <!-- Probe Control section -->
      <LcarsTitle version="centered" size="small" text="Probe control" color="text-white" />
      <LcarsRow :style="{ 'justify-content': 'center', width: '42rem' }">
        <LcarsComplexButton :color="randColor()" :style="{ width: '42rem' }">
          <LcarsCap version="round-left" />
          <LcarsBlock label="Remaining Probes" :style="{ width: '12rem' }" />
          <LcarsText id="rmnPrbTxt" :text="String(remainingProbes)" :style="{ width: '3rem', 'text-align': 'center' }" />
          <LcarsBlock version="decorator" :style="{ width: '2rem' }" />
          <LcarsBlock
            id="prbStsInd"
            :label="probeStatus"
            :version="probeStatus === 'Offline' ? 'red-dark-light' : undefined"
            :color="probeStatus !== 'Offline' ? 'bg-green-5' : undefined"
            :style="{ width: '7rem' }"
          />
          <LcarsButton
            version="round-right"
            size="large"
            label="Send to selected system"
            :color="randColor()"
            :style="{ width: '16rem' }"
            :disabled="remainingProbes === 0 || probeStatus !== 'Offline'"
            @click="sendProbe"
          />
        </LcarsComplexButton>
      </LcarsRow>
    </LcarsColumn>
  </LcarsRow>
</template>
