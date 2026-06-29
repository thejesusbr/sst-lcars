import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsScanner from '@/components/elements/LcarsScanner.vue'

const meta: Meta<typeof LcarsScanner> = {
  title: 'Elements/LcarsScanner',
  component: LcarsScanner,
  tags: ['autodocs'],
  argTypes: {
    version: {
      control: 'select',
      options: ['short', 'long'],
    },
    width: {
      control: 'number',
    },
    height: {
      control: 'number',
    },
    coordsColor: {
      control: 'select',
      options: ['text-light', 'text-white', 'text-dark', 'alert-fg', 'golden-tanoi-fg'],
    }
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Mock grid data representing a sector in Super Star Trek
// Row index (1 to height) and Col index (1 to width)
const mockGridData = {
  '1,2': { text: 'K', color: 'alert-fg' },     // Klingon
  '3,3': { text: 'B', color: 'anakiwa-fg' },    // Starbase
  '3,4': { text: 'E', color: 'golden-tanoi-fg' }, // Enterprise
  '2,2': { text: '*' },                        // Star
  '4,4': { text: '*' },                        // Star
  '5,6': { text: 'K', color: 'alert-fg' },     // Klingon
  '6,5': { text: '*' }                         // Star
}

export const Short: Story = {
  args: {
    version: 'short',
    width: 8,
    height: 8,
    gridData: mockGridData,
    coordsColor: 'text-light',
  },
}

export const Long: Story = {
  args: {
    version: 'long',
    width: 8,
    height: 8,
    gridData: mockGridData,
    coordsColor: 'text-light',
  },
}

export const CustomLabels: Story = {
  args: {
    version: 'short',
    width: 8,
    height: 8,
    gridData: mockGridData,
    rowLabels: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    colLabels: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'],
    coordsColor: 'golden-tanoi-fg',
  },
}
