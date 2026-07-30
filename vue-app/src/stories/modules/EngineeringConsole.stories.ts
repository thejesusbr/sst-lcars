import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EngineeringConsole from '@/components/modules/EngineeringConsole.vue'
import { useGameState } from '@/stores/useGameState'
import type { GameState, SubsystemIntegrity } from '@/types/game'

/**
 * **BREAKING:** as 8 props `*Integrity` foram removidas — o console lê os **9**
 * subsistemas de `useGameState` (a lista antiga não incluía o Auto-Navigation
 * Computer). Cenário se monta por decorator escrevendo no estado.
 */
const meta: Meta<typeof EngineeringConsole> = {
  title: 'Modules/EngineeringConsole',
  component: EngineeringConsole,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

const decorator = () => ({
  template:
    '<div style="width: 100%; min-height: 600px; background: #000; padding: 2rem; box-sizing: border-box;"><story /></div>',
})

const scenario = (setup: (state: GameState) => void) => () => ({
  setup() {
    const gs = useGameState()
    setup(gs.$state)
  },
  template: '<story />',
})

const integrity = (overrides: Partial<SubsystemIntegrity>) => (state: GameState) => {
  Object.assign(state.subsystems, overrides)
}

export const Default: Story = {
  args: {},
  decorators: [scenario(integrity({})), decorator],
}

export const DamagedSystems: Story = {
  args: {},
  decorators: [
    scenario(
      integrity({
        warp: 45,
        lrs: 20,
        phasers: 80,
        shields: 30,
        autoNav: 55,
        warpCore: 60,
      }),
    ),
    decorator,
  ],
}

/** Equipes despachadas, fadigadas e em cooldown — as 3 fases da mecânica. */
export const TeamsWorking: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      integrity({ warp: 40, warpCore: 55, shields: 70 })(state)
      state.teams[0].status = 'working'
      state.teams[0].assignedSystem = 'warpCore'
      state.teams[0].efficiency = 79
      state.teams[0].turnsWorked = 1
      state.teams[1].status = 'working'
      state.teams[1].assignedSystem = 'warp'
      state.teams[1].efficiency = 40
      state.teams[1].turnsWorked = 4
      state.teams[2].status = 'cooldown'
      state.teams[2].efficiency = 20
    }),
    decorator,
  ],
}

/** Breach ativo: reparo fora do core roda pela metade e o relógio corre. */
export const CoreBreach: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      integrity({ warpCore: 35 })(state)
      state.breach = { active: true, containment: 40, turnsRemaining: 3 }
      state.manualOverload = 15
    }),
    decorator,
  ],
}
