import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ResultScreen from '@/components/modules/ResultScreen.vue'

const meta: Meta<typeof ResultScreen> = {
  title: 'Modules/ResultScreen',
  component: ResultScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Victory: Story = {
  args: {
    outcome: 'Victory',
    reason: 'All Klingon forces destroyed.',
    rating: 'Commander',
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 600px; background: #000;"><story /></div>',
    }),
  ],
}

export const Defeat: Story = {
  args: {
    outcome: 'Defeat',
    reason: 'The Enterprise was destroyed by a Warp Core breach.',
    rating: 'Ensign',
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 600px; background: #000;"><story /></div>',
    }),
  ],
}
