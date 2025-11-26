import type { Meta, StoryObj } from '@storybook/vue3-vite'
import WeaponsConsole from '@/components/modules/WeaponsConsole.vue'

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

export const Default: Story = {
  args: {},
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 600px; background: #000;"><story /></div>',
    }),
  ],
}
