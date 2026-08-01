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
import { usePresentation, type SectorSnapshot } from '@/stores/usePresentation'
import { ENEMY_FACTION_COLOR, ENEMY_TYPES, PLAYER_FACTION_COLOR } from '@/types/game'

/**
 * Cor de quem disparou, pela entidade viva no snapshot (`enemy-species`). Sem
 * entidade encontrada (base atracada redireciona o dano, `subsystem_hit` não
 * carrega `entityId`), cai pro `currentColor` do CSS — não é o inimigo que
 * falta cor, é o evento que não amarrou o autor.
 */
function attackerColor(view: SectorSnapshot, entityId: string | undefined): string | undefined {
  const entity = entityId ? view.entities.find((e) => e.id === entityId) : undefined
  if (!entity) return undefined
  return ENEMY_TYPES.includes(entity.type as (typeof ENEMY_TYPES)[number])
    ? ENEMY_FACTION_COLOR[entity.type as (typeof ENEMY_TYPES)[number]]
    : undefined
}

export function useCombatOverlay() {
  const presentation = usePresentation()

  return computed<ScannerOverlay | null>(() => {
    const evt = presentation.current
    // `at` é o que ancora o desenho. Evento sem célula (reparo, hail, sonda)
    // não tem o que encenar no grid.
    if (!evt?.at) return null

    // A nave sai do MESMO snapshot que o grid desenha. Lendo
    // `gameState.position.sector` ao vivo, um feixe disparado antes de a nave
    // se mover seria desenhado a partir da posição de destino dela.
    const view = presentation.sectorView
    if (!view) return null
    const ship = { ...view.ship }
    const key = presentation.sequence
    const durationMs = TURN_EVENT_PRESENT_MS

    switch (evt.type) {
      // Linha pulsante entre quem atira e o alvo — vocabulário do EGA Trek.
      case 'player_phasers':
        return { kind: 'beam', from: ship, to: evt.at, durationMs, key, color: PLAYER_FACTION_COLOR }

      // Vale pro inimigo também: ver o inimigo agir é o ponto da mudança.
      // Cor de facção é o que torna 3 atacantes diferentes legíveis (era 1
      // feixe igual pros 3, o jogador não sabia quem tinha atirado).
      case 'enemy_attack':
        return {
          kind: 'beam',
          from: evt.at,
          to: ship,
          durationMs,
          key,
          color: attackerColor(view, evt.entityId),
        }

      // Asterisco percorrendo as células até o alvo.
      case 'player_torpedo':
        return { kind: 'travel', from: ship, to: evt.at, durationMs, key, color: PLAYER_FACTION_COLOR }

      // Absorção de escudo, dano em casco e subsistema atingido pulsam na
      // própria nave, em sequência, logo depois do feixe que os causou.
      case 'shield_absorb':
      case 'hull_damage':
      case 'subsystem_hit':
        return {
          kind: 'impact',
          from: ship,
          to: evt.at,
          durationMs,
          key,
          color: attackerColor(view, evt.entityId),
        }

      default:
        return null
    }
  })
}
