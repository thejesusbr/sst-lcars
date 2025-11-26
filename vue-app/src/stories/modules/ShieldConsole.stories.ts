import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ShieldConsole from '@/components/modules/ShieldConsole.vue'

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

export const Default: Story = {
  args: {},
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 600px; background: #000;"><story /></div>',
    }),
  ],
}
