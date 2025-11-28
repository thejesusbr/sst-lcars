import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GameHud from '@/components/modules/GameHud.vue'

const meta: Meta<typeof GameHud> = {
  title: 'Modules/GameHud',
  component: GameHud,
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
      template: '<div style="width: 100%; height: 100vh; background: #000;"><story /></div>',
    }),
  ],
}
