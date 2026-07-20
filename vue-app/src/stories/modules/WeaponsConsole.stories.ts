import type { Meta, StoryObj } from '@storybook/vue3-vite'
import WeaponsConsole from '@/components/modules/WeaponsConsole.vue'

const meta: Meta<typeof WeaponsConsole> = {
  title: 'Modules/WeaponsConsole',
  component: WeaponsConsole,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    initialStock: { control: { type: 'number', min: 0, max: 12 } },
    initialPhaserTemp: { control: { type: 'number', min: 0, max: 270 } },
    initialTargets: { control: { type: 'number', min: 0, max: 20 } },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const decorator = () => ({
  template:
    '<div style="width: 100%; min-height: 700px; background: #000; padding: 2rem; box-sizing: border-box;"><story /></div>',
})

export const Default: Story = {
  args: {
    initialStock: 8,
    initialPhaserTemp: 50,
    initialTargets: 3,
  },
  decorators: [decorator],
}

export const OverheatedPhasers: Story = {
  args: {
    initialPhaserTemp: 220,
    initialStock: 4,
    initialTargets: 2,
  },
  decorators: [decorator],
}

export const EmptyTorpedoes: Story = {
  args: {
    initialStock: 0,
    initialPhaserTemp: 80,
    initialTargets: 5,
  },
  decorators: [decorator],
}
