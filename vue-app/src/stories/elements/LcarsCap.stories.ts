import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsCap from '@/components/elements/LcarsCap.vue'

const meta: Meta<typeof LcarsCap> = {
  title: 'Elements/LcarsCap',
  component: LcarsCap,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'],
    },
    version: {
      control: 'select',
      options: ['round-left', 'round-right'],
    },
    size: {
      control: 'select',
      options: ['tiny', 'small', 'medium', 'large', 'xlarge'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const RoundLeft: Story = {
  args: {
    color: 'pale-canary-bg',
    version: 'round-left',
  },
}

export const RoundRight: Story = {
  args: {
    color: 'golden-tanoi-bg',
    version: 'round-right',
  },
}

export const Small: Story = {
  args: {
    color: 'lilac-bg',
    version: 'round-left',
    size: 'small',
  },
}

export const Medium: Story = {
  args: {
    color: 'rust-bg',
    version: 'round-right',
    size: 'medium',
  },
}

export const Large: Story = {
  args: {
    color: 'tanoi-bg',
    version: 'round-left',
    size: 'large',
  },
}

export const XLarge: Story = {
  args: {
    color: 'neon-carrot-bg',
    version: 'round-right',
    size: 'xlarge',
  },
}
