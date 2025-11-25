import { reactive } from 'vue'
import type { LcarsColors, ThemeColors } from '@/types/lcars'

const lcarsColors: LcarsColors = reactive({
  pool: {
    blue: ['bg-blue-1', 'bg-blue-2', 'bg-blue-3', 'bg-blue-4', 'bg-blue-5'],
    green: ['bg-green-1', 'bg-green-2', 'bg-green-3', 'bg-green-4', 'bg-green-5'],
    purple: ['bg-purple-1', 'bg-purple-2', 'bg-purple-3', 'bg-purple-4', 'bg-purple-5'],
    orange: ['bg-orange-1', 'bg-orange-2', 'bg-orange-3', 'bg-orange-4', 'bg-orange-5'],
    red: ['bg-red-1', 'bg-red-2', 'bg-red-3', 'bg-red-4', 'bg-red-5'],
    grey: ['bg-grey-1', 'bg-grey-2', 'bg-grey-3', 'bg-grey-4', 'bg-grey-5']
  },
  primary: ['bg-blue-1', 'bg-blue-2', 'bg-blue-4', 'bg-blue-5', 'bg-orange-1', 'bg-green-2', 'bg-green-4', 'bg-green-5'],
  secondary: ['bg-blue-1', 'bg-blue-2', 'bg-blue-4', 'bg-blue-5', 'bg-orange-1', 'bg-orange-2', 'bg-orange-3', 'bg-orange-4'],
  tertiary: ['bg-blue-1', 'bg-blue-2', 'bg-blue-4', 'bg-blue-5', 'bg-orange-1', 'bg-purple-2', 'bg-purple-3', 'bg-purple-4'],
  custom: ['bg-orange-5', 'bg-blue-3', 'bg-blue-4', 'bg-blue-5', 'bg-green-3', 'bg-green-1', 'bg-purple-1', 'bg-purple-5']
})

const themeColors: ThemeColors = reactive({
  pool: [
    'anakiwa-bg',
    'atomic-tangerine-bg',
    'bahama-blue-bg',
    'bourbon-bg',
    'blue-bell-bg',
    'chestnut-rose-bg',
    'cosmic-bg',
    'danub-bg',
    'dodger-pale-bg',
    'dodger-soft-bg',
    'eggplant-bg',
    'golden-tanoi-bg',
    'hopbush-bg',
    'husk-bg',
    'indigo-bg',
    'lavender-purple-bg',
    'lilac-bg',
    'mariner-bg',
    'medium-carmine-bg',
    'melrose-bg',
    'navy-blue-bg',
    'near-blue-bg',
    'neon-carrot-bg',
    'orange-peel-bg',
    'pale-canary-bg',
    'periwinkle-bg',
    'alert-bg',
    'red-damask-bg',
    'rust-bg',
    'sandy-brown-bg',
    'tamarillo-bg',
    'tanoi-bg'
  ],
  interactive: [
    'primary-interactive',
    'secondary-interactive',
    'tertiary-interactive'
  ],
  static: ['primary-static', 'secondary-static', 'tertiary-static'],
  text: {
    dark: 'text-dark',
    light: 'text-light',
    white: 'text-white',
    black: 'text-black'
  }
})

export function useLcarsColors() {
  const randColor = (array: string[] = themeColors.interactive): string => {
    return array[Math.floor(array.length * Math.random())]
  }

  const randColorGroup = (array: string[], length: number): string[] => {
    const result: string[] = []
    for (let i = 0; i < length; i++) {
      result.push(array[Math.floor(array.length * Math.random())])
    }
    return result
  }

  return {
    lcarsColors,
    themeColors,
    randColor,
    randColorGroup
  }
}
