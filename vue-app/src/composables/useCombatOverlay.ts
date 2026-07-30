/**
 * Traduz o evento em cena (`usePresentation.current`) no efeito que o
 * `LcarsScanner` desenha.
 *
 * Existe como composable, e não como lógica dentro de cada console, porque o SRS
 * do `NavSensingConsole` e o scanner do `WeaponsConsole` mostram o MESMO setor —
 * se cada um traduzisse por conta própria, eles divergiriam no que desenham.
 */

import { computed } from 'vue'
import type { ScannerOverlay } from '@/components/elements/LcarsScanner.vue'
import { TURN_EVENT_PRESENT_MS } from '@/engine/constants'
import { useGameState } from '@/stores/useGameState'
import { usePresentation } from '@/stores/usePresentation'

export function useCombatOverlay() {
  const gameState = useGameState()
  const presentation = usePresentation()

  return computed<ScannerOverlay | null>(() => {
    const evt = presentation.current
    // `at` é o que ancora o desenho. Evento sem célula (reparo, hail, sonda)
    // não tem o que encenar no grid.
    if (!evt?.at) return null

    const ship = { ...gameState.position.sector }
    const key = presentation.sequence
    const durationMs = TURN_EVENT_PRESENT_MS

    switch (evt.type) {
      // Linha pulsante entre quem atira e o alvo — vocabulário do EGA Trek.
      case 'player_phasers':
        return { kind: 'beam', from: ship, to: evt.at, durationMs, key }

      // Vale pro inimigo também: ver o inimigo agir é o ponto da mudança.
      case 'enemy_attack':
        return { kind: 'beam', from: evt.at, to: ship, durationMs, key }

      // Asterisco percorrendo as células até o alvo.
      case 'player_torpedo':
        return { kind: 'travel', from: ship, to: evt.at, durationMs, key }

      // Absorção de escudo, dano em casco e subsistema atingido pulsam na
      // própria nave, em sequência, logo depois do feixe que os causou.
      case 'shield_absorb':
      case 'hull_damage':
      case 'subsystem_hit':
        return { kind: 'impact', from: ship, to: evt.at, durationMs, key }

      default:
        return null
    }
  })
}
