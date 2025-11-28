import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsText from '@/components/elements/LcarsText.vue'

const meta: Meta<typeof LcarsText> = {
  title: 'Elements/LcarsText',
  component: LcarsText,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['text-white', 'text-light', 'text-dark', 'pale-canary-fg', 'golden-tanoi-fg', 'lilac-fg'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    text: 'LCARS Text',
    color: 'text-white',
  },
}

export const Light: Story = {
  args: {
    text: 'Light Text',
    color: 'text-light',
  },
}

export const Dark: Story = {
  args: {
    text: 'Dark Text',
    color: 'text-dark',
  },
}

export const Number: Story = {
  args: {
    text: '12345',
    color: 'text-white',
  },
}
