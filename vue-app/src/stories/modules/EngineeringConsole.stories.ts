import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EngineeringConsole from '@/components/modules/EngineeringConsole.vue'

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

export const Default: Story = {
  args: {},
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 600px; background: #000;"><story /></div>',
    }),
  ],
}
