import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'

const meta: Meta<typeof LcarsBlock> = {
  title: 'Elements/LcarsBlock',
  component: LcarsBlock,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'],
    },
    version: {
      control: 'select',
      options: ['dark-light'],
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
    style: { width: '120px' },
  },
}

export const WithLabel: Story = {
  args: {
    color: 'golden-tanoi-bg',
    label: 'Block Label',
    style: { width: '120px' },
  },
}

export const DarkLight: Story = {
  args: {
    color: 'lilac-bg',
    version: 'dark-light',
    label: 'Blinking',
    style: { width: '120px' },
  },
}

export const FlexGrow: Story = {
  args: {
    color: 'rust-bg',
    flexc: 'v',
  },
  decorators: [
    () => ({
      template: '<div style="display: flex; flex-direction: column; height: 200px;"><story /></div>',
    }),
  ],
}
