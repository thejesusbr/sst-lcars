import { reactive } from 'vue'
import type { LcarsColors } from '@/types/lcars'

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

export type SystemStatus = 'nominal' | 'damaged' | 'critical' | 'disabled'

const STATUS_CLASS: Record<SystemStatus, string> = {
  nominal: 'status-nominal-bg',
  damaged: 'status-damaged-bg',
  critical: 'status-critical-bg',
  disabled: 'status-disabled-bg'
}

export function useLcarsColors() {
  // Classe de cor semantica (nominal/damaged/critical), theme-aware e com
  // variante .red-alert -- ver colors.css. Cada console mantem seus
  // proprios limiares/direcao de calculo, so troca o literal de classe por
  // isso.
  const statusColor = (status: SystemStatus): string => STATUS_CLASS[status]

  return {
    lcarsColors,
    statusColor
  }
}
