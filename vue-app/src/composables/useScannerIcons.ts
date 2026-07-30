import enterpriseIcon    from '@/assets/icons/ships/enterprise.png'
import enterpriseAIcon   from '@/assets/icons/ships/enterprise-A.png'
import enterpriseBIcon   from '@/assets/icons/ships/enterprise-B.png'
import enterpriseCIcon   from '@/assets/icons/ships/enterprise-C.png'
import enterpriseDIcon   from '@/assets/icons/ships/enterprise-D.png'
import enterpriseEIcon   from '@/assets/icons/ships/enterprise-E.png'
import excelsiorIcon     from '@/assets/icons/ships/excelsior.png'
import reliantIcon       from '@/assets/icons/ships/reliant.png'
import defiantIcon       from '@/assets/icons/ships/defiant.png'

import klingonCruiserIcon from '@/assets/icons/ships/klingon-Cruiser.png'
import klingonD7Icon      from '@/assets/icons/ships/klingon-D7.png'

import warbirdIcon       from '@/assets/icons/ships/warbird.png'
import romulanScoutIcon  from '@/assets/icons/ships/romulan-Scout.png'

import spaceDockIcon     from '@/assets/icons/objects/space-Dock.png'
import regula1Icon       from '@/assets/icons/objects/regula-1.png'
import k7Icon            from '@/assets/icons/objects/k7.png'

// ── Entity types ────────────────────────────────────────────────────────────

export const ScannerEntity = {
  PLAYER:           'player',
  KLINGON_CRUISER:  'klingon_cruiser',
  KLINGON_D7:       'klingon_d7',
  ROMULAN_WARBIRD:  'romulan_warbird',
  ROMULAN_SCOUT:    'romulan_scout',
  STARBASE_DOCK:    'starbase_dock',
  STARBASE_SCIENCE: 'starbase_science',
  KLINGON_BASE:     'klingon_base',
  PLANET:           'planet',
} as const

export type ScannerEntityType = typeof ScannerEntity[keyof typeof ScannerEntity]

// ── Player ship options (for future ship-selection screen) ──────────────────

export interface PlayerShipOption {
  key: string
  label: string
  img: string
}

export const playerShipOptions: PlayerShipOption[] = [
  { key: 'enterprise-d', label: 'U.S.S. Enterprise NCC-1701-D',  img: enterpriseDIcon  },
  { key: 'enterprise-e', label: 'U.S.S. Enterprise NCC-1701-E',  img: enterpriseEIcon  },
  { key: 'enterprise',   label: 'U.S.S. Enterprise NCC-1701',    img: enterpriseIcon   },
  { key: 'enterprise-a', label: 'U.S.S. Enterprise NCC-1701-A',  img: enterpriseAIcon  },
  { key: 'enterprise-b', label: 'U.S.S. Enterprise NCC-1701-B',  img: enterpriseBIcon  },
  { key: 'enterprise-c', label: 'U.S.S. Enterprise NCC-1701-C',  img: enterpriseCIcon  },
  { key: 'excelsior',    label: 'U.S.S. Excelsior NCC-2000',     img: excelsiorIcon    },
  { key: 'reliant',      label: 'U.S.S. Reliant NCC-1864',       img: reliantIcon      },
  { key: 'defiant',      label: 'U.S.S. Defiant NX-74205',       img: defiantIcon      },
]

// ── Fixed entity → icon mapping ─────────────────────────────────────────────

export const scannerIconMap: Record<Exclude<ScannerEntityType, 'planet' | 'player'>, string> = {
  [ScannerEntity.KLINGON_CRUISER]:  klingonCruiserIcon,
  [ScannerEntity.KLINGON_D7]:       klingonD7Icon,
  [ScannerEntity.ROMULAN_WARBIRD]:  warbirdIcon,
  [ScannerEntity.ROMULAN_SCOUT]:    romulanScoutIcon,
  [ScannerEntity.STARBASE_DOCK]:    spaceDockIcon,
  [ScannerEntity.STARBASE_SCIENCE]: regula1Icon,
  [ScannerEntity.KLINGON_BASE]:     k7Icon,
}

// ── Planet pool (all categories, random selection by engine) ────────────────

// Vite resolves this glob at build time; Zone.Identifier sidecars are excluded
// because their filenames contain ':' and don't match the *.png pattern.
const planetModules = import.meta.glob<string>(
  '/src/assets/icons/planets/**/*.png',
  { eager: true, query: '?url', import: 'default' },
)

export const planetIcons: string[] = Object.values(planetModules)

export function getRandomPlanet(): string {
  return planetIcons[Math.floor(Math.random() * planetIcons.length)]
}

/**
 * Ícone de planeta DETERMINÍSTICO por chave (id da entidade). O aleatório puro
 * fazia o planeta trocar de arte a cada re-render — e cada console sortear o
 * seu: SRS e Weapons mostravam planetas diferentes pra MESMA entidade. A arte é
 * cosmética, mas identidade visual tem que ser estável na sessão inteira; o id
 * (`q{row}{col}-p-0`) já é estável por construção.
 */
export function getPlanetIconFor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  }
  return planetIcons[hash % planetIcons.length]
}

// ── Main composable ──────────────────────────────────────────────────────────

export function useScannerIcons(playerShipKey = 'enterprise-d') {
  const playerShip = playerShipOptions.find(o => o.key === playerShipKey)
    ?? playerShipOptions[0]

  function getIcon(entity: ScannerEntityType): string {
    if (entity === ScannerEntity.PLAYER)  return playerShip.img
    if (entity === ScannerEntity.PLANET)  return getRandomPlanet()
    return scannerIconMap[entity as keyof typeof scannerIconMap]
  }

  return {
    getIcon,
    playerShip,
    playerShipOptions,
    scannerIconMap,
    planetIcons,
    getRandomPlanet,
    getPlanetIconFor,
    ScannerEntity,
  }
}
