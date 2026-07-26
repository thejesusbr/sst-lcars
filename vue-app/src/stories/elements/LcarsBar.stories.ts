import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsBar from '@/components/elements/LcarsBar.vue'

const meta: Meta<typeof LcarsBar> = {
  title: 'Elements/LcarsBar',
  component: LcarsBar,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'],
    },
    version: {
      control: 'select',
      options: ['small', 'medium', 'large'],
    },
    flex: {
      control: 'select',
      options: ['v', 'h'],
    },
    flexc: {
      control: 'select',
      options: ['v', 'h'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    color: 'pale-canary-bg',
    style: { width: '200px' },
  },
}

export const WithLabel: Story = {
  args: {
    color: 'golden-tanoi-bg',
    label: 'Bar Label',
    style: { width: '200px' },
  },
}

export const Small: Story = {
  args: {
    color: 'lilac-bg',
    version: 'small',
  },
}

export const Medium: Story = {
  args: {
    color: 'rust-bg',
    version: 'medium',
  },
}

export const Large: Story = {
  args: {
    color: 'tanoi-bg',
    version: 'large',
  },
}

export const FlexGrow: Story = {
  args: {
    color: 'neon-carrot-bg',
    flexc: 'h',
  },
  decorators: [
    () => ({
      template: '<div style="display: flex; width: 400px;"><story /></div>',
    }),
  ],
}
