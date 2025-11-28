import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsTitle from '@/components/elements/LcarsTitle.vue'

const meta: Meta<typeof LcarsTitle> = {
  title: 'Elements/LcarsTitle',
  component: LcarsTitle,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['text-white', 'text-light', 'text-dark', 'pale-canary-fg', 'golden-tanoi-fg', 'lilac-fg'],
    },
    version: {
      control: 'select',
      options: ['small', 'half', 'centered'],
    },
    size: {
      control: 'select',
      options: ['small'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    text: 'LCARS Title',
    color: 'text-white',
  },
}

export const Small: Story = {
  args: {
    text: 'Small Title',
    color: 'text-white',
    size: 'small',
  },
}

export const Centered: Story = {
  args: {
    text: 'Centered Title',
    color: 'text-white',
    version: 'centered',
  },
}

export const Light: Story = {
  args: {
    text: 'Light Title',
    color: 'text-light',
  },
}
