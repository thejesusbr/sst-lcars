import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SituationPanel from '@/components/modules/SituationPanel.vue'
import { useGameState } from '@/stores/useGameState'
import type { GameState } from '@/types/game'

/**
 * **BREAKING:** as props de exibição (`warpCoreStatus`, `overloadPercent`,
 * `shieldStatus`, `torpedoStock`, …) foram removidas — tudo deriva de
 * `useGameState`. `warpCoreStatus` em particular era prop com valor `'BREACH'`
 * que nem existia no tipo (`'NOM' | 'DAM' | 'BRC'`); agora vem de
 * `breach.active`, então o estado inconsistente deixou de ser representável.
 */
const meta: Meta<typeof SituationPanel> = {
  title: 'Modules/SituationPanel',
  component: SituationPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

const decorator = () => ({
  template:
    '<div style="width: 100%; height: 600px; background: #000;"><story /></div>',
})

const scenario = (setup: (state: GameState) => void) => () => ({
  setup() {
    const gs = useGameState()
    setup(gs.$state)
  },
  template: '<story />',
})

export const Default: Story = {
  args: {},
  decorators: [scenario(() => {}), decorator],
}

export const CoreBreach: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      state.breach = { active: true, containment: 20, turnsRemaining: 3 }
      state.subsystems.warpCore = 35
      state.manualOverload = 18
      state.shieldEnergy = 0
      state.shieldDamageTaken = 1500
      state.torpedoStock = 2
      state.alertLevel = 'red'
    }),
    decorator,
  ],
}

/** Abas piscando: entradas de log acima do marcador de leitura. */
export const UnreadLogs: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      state.combatLog = [
        { stardate: 3601, category: 'general', text: '*** KLINGON DESTROYED ***' },
        { stardate: 3601, category: 'engineering', text: 'Reparo em warpCore: +12.' },
        { stardate: 3602, category: 'captain', text: 'Sonda reporta quadrante 5,3: KBS 104.' },
      ]
      state.logReadMarkers = { captain: 0, general: 0, engineering: 0 }
    }),
    decorator,
  ],
}

/** Yellow é estado válido e legível — só não tem tema próprio ainda. */
export const YellowAlert: Story = {
  args: {},
  decorators: [
    scenario((state) => {
      state.alertLevel = 'yellow'
    }),
    decorator,
  ],
}
