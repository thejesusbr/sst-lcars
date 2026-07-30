import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ShieldConsole from '@/components/modules/ShieldConsole.vue'
import { useGameState } from '@/stores/useGameState'

const meta: Meta<typeof ShieldConsole> = {
  title: 'Modules/ShieldConsole',
  component: ShieldConsole,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

const decorator = () => ({
  template: '<div style="width: 100%; min-height: 600px; background: #000; padding: 2rem; box-sizing: border-box;"><story /></div>',
})

// Só o nível do escudo: não há estoque de energia de onde ele saia. O custo do
// escudo erguido é vazão por turno (`subsystemDraw`), não um saque de tanque.
const makeStateDecorator = (shield: number) => () => ({
  setup() {
    const gs = useGameState()
    gs.shieldEnergy = shield
  },
  template: '<story />',
})

export const Default: Story = {
  args: {},
  decorators: [makeStateDecorator(1500), decorator],
}

export const ShieldsDown: Story = {
  args: {},
  decorators: [makeStateDecorator(0), decorator],
}

export const MaxShields: Story = {
  args: {},
  decorators: [makeStateDecorator(2500), decorator],
}
