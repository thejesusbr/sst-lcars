import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NavSensingConsole from '@/components/modules/NavSensingConsole.vue'

const meta: Meta<typeof NavSensingConsole> = {
  title: 'Modules/NavSensingConsole',
  component: NavSensingConsole,
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
