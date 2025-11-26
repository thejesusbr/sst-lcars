import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SolidLevelBar from '@/components/widgets/SolidLevelBar.vue'

const meta: Meta<typeof SolidLevelBar> = {
  title: 'Widgets/SolidLevelBar',
  component: SolidLevelBar,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'],
    },
    level: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    max: {
      control: { type: 'number', min: 1 },
    },
    label: {
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    color: 'pale-canary-bg',
    level: 75,
    max: 100,
    style: { width: '200px' },
  },
}

export const WithLabel: Story = {
  args: {
    color: 'golden-tanoi-bg',
    level: 50,
    max: 100,
    label: 'Energy',
    style: { width: '200px' },
  },
}

export const LowLevel: Story = {
  args: {
    color: 'rust-bg',
    level: 20,
    max: 100,
    label: 'Shields',
    style: { width: '200px' },
  },
}

export const HighLevel: Story = {
  args: {
    color: 'lilac-bg',
    level: 95,
    max: 100,
    label: 'Power',
    style: { width: '200px' },
  },
}

export const CustomMax: Story = {
  args: {
    color: 'tanoi-bg',
    level: 150,
    max: 200,
    label: 'Warp',
    style: { width: '200px' },
  },
}

export const Empty: Story = {
  args: {
    color: 'neon-carrot-bg',
    level: 0,
    max: 100,
    label: 'Empty',
    style: { width: '200px' },
  },
}

export const Full: Story = {
  args: {
    color: 'orange-peel-bg',
    level: 100,
    max: 100,
    label: 'Full',
    style: { width: '200px' },
  },
}
