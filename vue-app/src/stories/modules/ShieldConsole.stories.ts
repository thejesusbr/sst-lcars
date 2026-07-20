import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ShieldConsole from '@/components/modules/ShieldConsole.vue'

const meta: Meta<typeof ShieldConsole> = {
  title: 'Modules/ShieldConsole',
  component: ShieldConsole,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    initialShieldEnergy: { control: { type: 'number', min: 0, max: 2500 } },
    initialMainEnergy: { control: { type: 'number', min: 0, max: 4500 } },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const decorator = () => ({
  template: '<div style="width: 100%; min-height: 600px; background: #000; padding: 2rem; box-sizing: border-box;"><story /></div>',
})

export const Default: Story = {
  args: {
    initialShieldEnergy: 1500,
    initialMainEnergy: 3000,
  },
  decorators: [decorator],
}

export const ShieldsDown: Story = {
  args: {
    initialShieldEnergy: 0,
    initialMainEnergy: 4500,
  },
  decorators: [decorator],
}

export const MaxShields: Story = {
  args: {
    initialShieldEnergy: 2500,
    initialMainEnergy: 2000,
  },
  decorators: [decorator],
}
