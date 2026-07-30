<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useGameState } from '@/stores/useGameState'
import { usePresentation } from '@/stores/usePresentation'
import BriefingScreen from './BriefingScreen.vue'
import GameHud from './GameHud.vue'
import ResultScreen from './ResultScreen.vue'

// Modo vem do GameState, nao de prop estatica: `endGame.evaluateEndGame` seta
// `mode = 'result'` ao cruzar qualquer condicao terminal, e a tela tem que
// seguir isso sozinha. A prop fica so como override pro Storybook.
const props = defineProps<{
  mode?: 'briefing' | 'playing' | 'result'
}>()

const gameState = useGameState()

const mode = computed(() => props.mode ?? gameState.mode)

const outcome = computed(() =>
  gameState.result?.victory ? ('Victory' as const) : ('Defeat' as const),
)

const REASON_TEXT: Record<string, string> = {
  victory: 'All Klingon forces destroyed.',
  warp_core_explosion: 'The warp core breached containment and detonated.',
  destroyed_with_base: 'The ship was destroyed alongside the docked starbase.',
  hull_destroyed: 'Structural integrity failed. The ship broke apart.',
  radiation_death: 'Radiation flooded the ship before the breach was contained.',
  crew_asphyxiation: 'Life support failed. The crew asphyxiated.',
  no_starbases: 'Every Federation starbase was destroyed.',
  out_of_time: 'The mission clock ran out.',
}

const reason = computed(() =>
  gameState.result ? REASON_TEXT[gameState.result.reason] : '',
)

const rating = computed(() => String(gameState.result?.rating ?? 0))

// Sair da tela de jogo mata a apresentação: um fim de jogo no meio de uma
// encenação (ou de uma viagem de warp) deixaria a fila drenando e o modo de
// viagem avançando turnos numa partida que já acabou. Um dono só de timer só
// serve se alguém mandar ele parar.
const presentation = usePresentation()
watch(mode, (m) => {
  if (m !== 'playing') presentation.cancel()
})
onUnmounted(() => presentation.cancel())

const startMission = () => gameState.setMode('playing')
const newGame = () => gameState.newGame()
</script>

<template>
  <BriefingScreen v-if="mode === 'briefing'" @start="startMission" />
  <GameHud v-else-if="mode === 'playing'" />
  <ResultScreen
    v-else-if="mode === 'result'"
    :outcome="outcome"
    :reason="reason"
    :rating="rating"
    @new-game="newGame"
  />
</template>
