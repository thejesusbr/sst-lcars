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

// ── enemy-species: overlay de combate colorido por facção ──────────────────
// Um `ScannerOverlay` só mostra 1 feixe por vez; 4 stories, 1 por facção, é o
// jeito de conferir as 4 cores (e o contraste sob tema/red-alert) lado a lado
// no Storybook em vez de depender só do playthrough ao vivo.

export const OverlayPlayerBeam: Story = {
  args: {
    version: 'short',
    width: 8,
    height: 8,
    gridData: mockGridData,
    overlay: {
      kind: 'beam',
      from: { row: 3, col: 4 },
      to: { row: 1, col: 2 },
      durationMs: 3000,
      key: 'player',
      color: 'var(--faction-player)',
    },
  },
}

export const OverlayKlingonBeam: Story = {
  args: {
    version: 'short',
    width: 8,
    height: 8,
    gridData: mockGridData,
    overlay: {
      kind: 'beam',
      from: { row: 1, col: 2 },
      to: { row: 3, col: 4 },
      durationMs: 3000,
      key: 'klingon',
      color: 'var(--faction-klingon)',
    },
  },
}

export const OverlayRomulanBeam: Story = {
  args: {
    version: 'short',
    width: 8,
    height: 8,
    gridData: mockGridData,
    overlay: {
      kind: 'beam',
      from: { row: 5, col: 6 },
      to: { row: 3, col: 4 },
      durationMs: 3000,
      key: 'romulan',
      color: 'var(--faction-romulan)',
    },
  },
}

export const OverlayRaiderBeam: Story = {
  args: {
    version: 'short',
    width: 8,
    height: 8,
    gridData: mockGridData,
    overlay: {
      kind: 'beam',
      from: { row: 6, col: 5 },
      to: { row: 3, col: 4 },
      durationMs: 3000,
      key: 'raider',
      color: 'var(--faction-raider)',
    },
  },
}
