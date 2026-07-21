import type { Meta, StoryObj } from '@storybook/vue3-vite'
import GameScreen from '@/components/modules/GameScreen.vue'

const meta: Meta<typeof GameScreen> = {
  title: 'Modules/GameScreen',
  component: GameScreen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    mode: {
      control: { type: 'radio' },
      options: ['briefing', 'playing', 'result'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    mode: 'playing',
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 800px; background: #000;"><story /></div>',
    }),
  ],
}
