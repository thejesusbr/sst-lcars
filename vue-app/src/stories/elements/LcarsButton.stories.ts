import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsButton from '@/components/elements/LcarsButton.vue'

const meta: Meta<typeof LcarsButton> = {
  title: 'Elements/LcarsButton',
  component: LcarsButton,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'],
    },
    size: {
      control: 'select',
      options: ['small', 'large'],
    },
    version: {
      control: 'select',
      options: ['round', 'round-left', 'round-right'],
    },
    toggle: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    color: 'pale-canary-bg',
    label: 'Button',
  },
}

export const WithLabel: Story = {
  args: {
    color: 'golden-tanoi-bg',
    label: 'Click Me',
  },
}

export const RoundLeft: Story = {
  args: {
    color: 'lilac-bg',
    label: 'Round Left',
    version: 'round-left',
  },
}

export const RoundRight: Story = {
  args: {
    color: 'rust-bg',
    label: 'Round Right',
    version: 'round-right',
  },
}

export const Round: Story = {
  args: {
    color: 'tanoi-bg',
    label: 'Round',
    version: 'round',
  },
}

export const Toggle: Story = {
  args: {
    color: 'neon-carrot-bg',
    label: 'Toggle',
    toggle: false,
  },
}

export const Disabled: Story = {
  args: {
    color: 'orange-peel-bg',
    label: 'Disabled',
    disabled: true,
  },
}

export const Small: Story = {
  args: {
    color: 'pale-canary-bg',
    label: 'Small',
    size: 'small',
  },
}

export const Large: Story = {
  args: {
    color: 'golden-tanoi-bg',
    label: 'Large',
    size: 'large',
  },
}
