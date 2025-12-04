import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsElbow from '@/components/elements/LcarsElbow.vue'

const meta: Meta<typeof LcarsElbow> = {
  title: 'Elements/LcarsElbow',
  component: LcarsElbow,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'],
    },
    direction: {
      control: 'select',
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
    version: {
      control: 'select',
      options: ['horizontal', 'vertical'],
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'default', 'base'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const TopLeft: Story = {
  args: {
    color: 'pale-canary-bg',
    direction: 'top-left',
    size: 'medium',
  },
}

export const TopRight: Story = {
  args: {
    color: 'golden-tanoi-bg',
    direction: 'top-right',
    size: 'medium',
  },
}

export const BottomLeft: Story = {
  args: {
    color: 'lilac-bg',
    direction: 'bottom-left',
    size: 'medium',
  },
}

export const BottomRight: Story = {
  args: {
    color: 'rust-bg',
    direction: 'bottom-right',
    size: 'medium',
  },
}

export const Small: Story = {
  args: {
    color: 'tanoi-bg',
    direction: 'top-left',
    size: 'small',
  },
}

export const WithLabel: Story = {
  args: {
    color: 'neon-carrot-bg',
    direction: 'top-right',
    size: 'medium',
    label: 'Elbow',
  },
}
