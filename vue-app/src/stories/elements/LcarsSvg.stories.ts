import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsSvg from '@/components/elements/LcarsSvg.vue'

const meta: Meta<typeof LcarsSvg> = {
  title: 'Elements/LcarsSvg',
  component: LcarsSvg,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const circleSvg = `
  <circle cx="50" cy="50" r="40" fill="#fc6" />
`

const crossSvg = `
  <rect x="45" y="10" width="10" height="80" fill="#ff9" />
  <rect x="10" y="45" width="80" height="10" fill="#ff9" />
`

export const Circle: Story = {
  args: {
    content: circleSvg,
    style: { width: '100px', height: '100px' },
  },
}

export const Cross: Story = {
  args: {
    content: crossSvg,
    style: { width: '100px', height: '100px' },
  },
}
