export interface LcarsElementData {
  type: string
  id: string
  color?: string
  label?: string
  altLabel?: string | number
  text?: string
  size?: string
  version?: string
  direction?: string
  flex?: string
  flexc?: string
  hidden?: boolean
  disabled?: boolean
  fade?: boolean
  toggle?: boolean
  toggleGroup?: string
  noEvent?: boolean
  noTransition?: boolean
  reverse?: boolean
  href?: string
  src?: string
  name?: string
  group?: string
  html?: string
  inputValue?: string
  password?: boolean
  readOnly?: boolean
  state?: string
  style?: Record<string, string>
  class?: Record<string, boolean>
  attr?: Record<string, string>
  children?: LcarsElementDefinition[]
  namespace?: string
  level?: number
  min?: number
  max?: number
  xml?: string
  tag?: string
  coloring?: LcarsBracketColoring
  content?: LcarsElementDefinition[] | string
  template?: LcarsElementDefinition[]
}

export interface LcarsElementDefinition extends Partial<LcarsElementData> {
  type: string
  click?: (event?: Event) => void
  mouseenter?: (event?: Event) => void
  mouseleave?: (event?: Event) => void
  mousedown?: (event?: Event) => void
  mouseup?: (event?: Event) => void
  arrive?: () => void
  leave?: () => void
}

export interface LcarsBracketColoring {
  elbow?: string
  animated?: string
  column1?: string[]
  column2?: string[]
  column3?: string[]
  column4?: string[]
}

export interface LcarsColors {
  pool: {
    blue: string[]
    green: string[]
    purple: string[]
    orange: string[]
    red: string[]
    grey: string[]
  }
  primary: string[]
  secondary: string[]
  tertiary: string[]
  custom: string[]
}

export interface ThemeColors {
  pool: string[]
  interactive: string[]
  static: string[]
  text: {
    dark: string
    light: string
    white: string
    black: string
  }
}

export type LcarsElementType =
  | 'aside'
  | 'bar'
  | 'blank'
  | 'block'
  | 'button'
  | 'cap'
  | 'column'
  | 'complexButton'
  | 'content'
  | 'details'
  | 'elbow'
  | 'endcap'
  | 'footer'
  | 'header'
  | 'htmlTag'
  | 'img'
  | 'main'
  | 'nav'
  | 'oval'
  | 'row'
  | 'scanner'
  | 'section'
  | 'svg'
  | 'text'
  | 'title'
  | 'wrapper'
  | 'solidLevelBar'
  | 'defaultBracket'
  | 'defaultBarFrame'
  | 'scrollButton'
