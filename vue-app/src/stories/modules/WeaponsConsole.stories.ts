import type { Meta, StoryObj } from '@storybook/vue3-vite'
import WeaponsConsole from '@/components/modules/WeaponsConsole.vue'
import { useGameState } from '@/stores/useGameState'
import { SectorEntityType, type GameState } from '@/types/game'

/**
 * **BREAKING:** as props `initial*` foram removidas — o console lê tudo de
 * `useGameState`. Cenário de story agora se monta escrevendo no estado por um
 * decorator, não por args. É o mesmo padrão de `ShieldConsole.stories.ts`.
 */
const meta: Meta<typeof WeaponsConsole> = {
  title: 'Modules/WeaponsConsole',
  component: WeaponsConsole,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

const decorator = () => ({
  template:
    '<div style="width: 100%; min-height: 700px; background: #000; padding: 2rem; box-sizing: border-box;"><story /></div>',
})

/** Popula o setor com N inimigos visíveis pro console ter em que mirar. */
const withEnemies = (count: number) => (state: GameState) => {
  state.currentSector = Array.from({ length: count }, (_, i) => ({
    id: `k${i + 1}`,
    type: SectorEntityType.KLINGON_CRUISER,
    position: { row: 2 + i, col: 3 + i },
    enemyPower: 200,
  }))
  state.weaponsLocked = count > 0
  state.tubes.forEach((tube, i) => {
    tube.targetId = count > 0 ? `k${(i % count) + 1}` : null
  })
}

const scenario = (setup: (state: GameState) => void) => () => ({
  setup() {
    const gs = useGameState()
    setup(gs.$state)
  },
  template: '<story />',
})

export const Default: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      state.torpedoStock = 8
      state.phaserTemp = 50
      withEnemies(3)(state)
    }),
    decorator,
  ],
}

export const OverheatedPhasers: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      state.torpedoStock = 4
      state.phaserTemp = 220
      withEnemies(2)(state)
    }),
    decorator,
  ],
}

export const EmptyTorpedoes: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      state.torpedoStock = 0
      state.phaserTemp = 80
      state.tubes.forEach((tube) => (tube.loaded = false))
      withEnemies(5)(state)
    }),
    decorator,
  ],
}

/** Phaser Banks em crítico: disparo bloqueado, não só menos eficaz. */
export const PhasersCritical: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      state.subsystems.phasers = 25
      state.phaserTemp = 150
      withEnemies(2)(state)
    }),
    decorator,
  ],
}
