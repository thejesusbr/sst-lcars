import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SituationPanel from '@/components/modules/SituationPanel.vue'

const meta: Meta<typeof SituationPanel> = {
  title: 'Modules/SituationPanel',
  component: SituationPanel,
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

export const CoreBreach: Story = {
  args: {
    warpCoreStatus: 'BREACH',
    overloadPercent: 18,
    breachTurnsRemaining: 3,
    shieldStatus: 'DOWN',
    torpedoStock: 2,
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 600px; background: #000;"><story /></div>',
    }),
  ],
}
