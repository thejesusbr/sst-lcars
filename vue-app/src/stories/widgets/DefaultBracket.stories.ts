import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DefaultBracket from '@/components/widgets/DefaultBracket.vue'

const meta: Meta<typeof DefaultBracket> = {
  title: 'Widgets/DefaultBracket',
  component: DefaultBracket,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'],
    },
    title: {
      control: 'text',
    },
    subtitle: {
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    color: 'pale-canary-bg',
    title: 'LCARS',
    subtitle: 'System',
    style: { width: '300px', height: '200px' },
  },
}

export const WithTitle: Story = {
  args: {
    color: 'golden-tanoi-bg',
    title: 'Navigation',
    subtitle: 'Console',
    style: { width: '300px', height: '200px' },
  },
}

export const LilacColor: Story = {
  args: {
    color: 'lilac-bg',
    title: 'Engineering',
    subtitle: 'Status',
    style: { width: '300px', height: '200px' },
  },
}

export const RustColor: Story = {
  args: {
    color: 'rust-bg',
    title: 'Tactical',
    subtitle: 'Display',
    style: { width: '300px', height: '200px' },
  },
}

export const LargeSize: Story = {
  args: {
    color: 'tanoi-bg',
    title: 'Main',
    subtitle: 'Viewer',
    style: { width: '500px', height: '300px' },
  },
}
