import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CombatLog from '@/components/modules/CombatLog.vue'

const meta: Meta<typeof CombatLog> = {
  title: 'Modules/CombatLog',
  component: CombatLog,
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
      template: '<div style="width: 100%; height: 600px; background: #000; position: relative;"><story /></div>',
    }),
  ],
}
