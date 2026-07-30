/**
 * Projeção do `GameState` pro formato de célula do `LcarsScanner`.
 *
 * Fonte ÚNICA das duas telas que desenham grid 8x8: `NavSensingConsole` (SRS do
 * setor + LRS dos quadrantes vizinhos) e `StarChartConsole` (galáxia acumulada).
 * Antes cada uma tinha seu próprio mock e sua própria regra de cor, e elas
 * divergiam — o LRS e o Star Chart mostravam coisas diferentes pro mesmo
 * quadrante.
 */

import type { ScannerCell } from '@/components/elements/LcarsScanner.vue'
import {
  ScannerEntity,
  useScannerIcons,
  type ScannerEntityType,
} from '@/composables/useScannerIcons'
import { SectorEntityType, type GridCoord, type SectorEntity } from '@/types/game'

/** Moldura na célula da nave. Ela sempre sabe onde está, independe de scan. */
export const PLAYER_MARKER_STYLE = { boxShadow: 'inset 0 0 0 3px #ffffff' }

export const cellKey = (c: GridCoord) => `${c.row},${c.col}`

/**
 * Cor derivada do conteúdo do código KBS, não fixada por célula: inimigo (K>0)
 * chama mais atenção que base aliada (B>0); só estrelas, nada de interesse.
 */
export function kbsColor(code: string): string {
  const klingons = Number(code[0] ?? 0)
  const bases = Number(code[1] ?? 0)
  if (klingons > 0) return 'alert-fg'
  if (bases > 0) return 'anakiwa-fg'
  return 'text-light'
}

/** Tipo de entidade do engine → ícone do scanner. Mapeamento é quase identidade. */
const ENTITY_ICON: Record<string, ScannerEntityType> = {
  [SectorEntityType.KLINGON_CRUISER]: ScannerEntity.KLINGON_CRUISER,
  [SectorEntityType.KLINGON_D7]: ScannerEntity.KLINGON_D7,
  [SectorEntityType.ROMULAN_WARBIRD]: ScannerEntity.ROMULAN_WARBIRD,
  [SectorEntityType.ROMULAN_SCOUT]: ScannerEntity.ROMULAN_SCOUT,
  // Raider decloacado usa o ícone de cruiser: não há arte própria pra ele.
  [SectorEntityType.CLOAKED_RAIDER]: ScannerEntity.KLINGON_CRUISER,
  [SectorEntityType.STARBASE_DOCK]: ScannerEntity.STARBASE_DOCK,
  // ponytail: Supply Depot não tem ícone próprio nos assets; reusa o de doca.
  // Trocar quando existir arte — só esta linha muda.
  [SectorEntityType.STARBASE_SUPPLY]: ScannerEntity.STARBASE_DOCK,
  [SectorEntityType.STARBASE_SCIENCE]: ScannerEntity.STARBASE_SCIENCE,
  [SectorEntityType.KLINGON_BASE]: ScannerEntity.KLINGON_BASE,
}

export function useQuadrantCells() {
  const { getIcon, getPlanetIconFor } = useScannerIcons()

  /**
   * Projeta `currentSector` pro grid do SRS. Indexado por **posição**, mas o
   * `id` estável da entidade vai em `data` — nada aqui referencia entidade por
   * índice de array (decisão #6).
   */
  const sectorCells = (
    entities: SectorEntity[],
    shipSector: GridCoord,
    options: { srsOnline?: boolean } = {},
  ): Record<string, ScannerCell> => {
    const grid: Record<string, ScannerCell> = {}

    // SRS desligado ou em crítico: a nave só sabe onde ela mesma está.
    if (options.srsOnline !== false) {
      for (const entity of entities) {
        // Cloacado não aparece: é a mecânica inteira do Cloaked Raider.
        if (entity.cloaked) continue

        if (entity.type === SectorEntityType.STAR) {
          grid[cellKey(entity.position)] = {
            text: '★',
            color: 'golden-tanoi-fg',
          }
          continue
        }
        if (entity.type === SectorEntityType.PLANET) {
          // Arte estável por id: mesma entidade = mesmo planeta, em todo
          // console e em todo re-render.
          grid[cellKey(entity.position)] = { img: getPlanetIconFor(entity.id) }
          continue
        }
        const icon = ENTITY_ICON[entity.type]
        if (icon) grid[cellKey(entity.position)] = { img: getIcon(icon) }
      }
    }

    grid[cellKey(shipSector)] = { img: getIcon(ScannerEntity.PLAYER) }
    return grid
  }

  /**
   * Projeta quadrantes conhecidos pro grid da galáxia. `confidence` esmaece a
   * célula: dado antigo de LRS fica translúcido, e a nave nunca esmaece a
   * própria posição.
   */
  const quadrantCells = (
    codes: Record<string, { code: string }>,
    shipQuadrant: GridCoord,
    confidence: Record<string, number> = {},
    restrictTo?: Set<string>,
  ): Record<string, ScannerCell> => {
    const grid: Record<string, ScannerCell> = {}

    for (const [key, entry] of Object.entries(codes)) {
      if (restrictTo && !restrictTo.has(key)) continue
      grid[key] = {
        text: entry.code,
        color: kbsColor(entry.code),
        style: { opacity: String(confidence[key] ?? 1) },
      }
    }

    const shipKey = cellKey(shipQuadrant)
    grid[shipKey] = {
      ...(grid[shipKey] ?? {}),
      style: PLAYER_MARKER_STYLE,
    }
    return grid
  }

  return { sectorCells, quadrantCells, kbsColor, cellKey }
}
