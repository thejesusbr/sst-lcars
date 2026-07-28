import type { Meta, StoryObj } from '@storybook/vue3-vite'
import CombatLog from '@/components/widgets/CombatLog.vue'

const meta: Meta<typeof CombatLog> = {
  title: 'Widgets/CombatLog',
  component: CombatLog,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    entries: [
      { stardate: 3600.1, category: 'general', text: '*** RED ALERT *** Klingons in this quadrant!' },
      { stardate: 3600.2, category: 'engineering', text: 'Shields absorb 340 units.' },
      { stardate: 3600.3, category: 'captain', text: "Captain's Log: entering hostile quadrant 3,4." },
    ],
    style: { width: '20rem' },
  },
}

export const Empty: Story = {
  args: {
    entries: [],
    style: { width: '20rem' },
  },
}
