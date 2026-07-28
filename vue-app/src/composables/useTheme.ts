import { ref, watch } from 'vue'

export interface ThemeDef {
  id: string
  label: string
  description: string
}

// Catalogo de temas -- cada um e um bloco [data-theme="<id>"] em colors.css
// que so redeclara as vars que muda (ver comentario la). "tos" e o :root
// default, sem attribute nenhum -- nao precisa de entrada em colors.css.
const THEMES: ThemeDef[] = [
  { id: 'tos', label: 'TOS', description: 'Paleta original quente (padrão)' },
  {
    id: 'first-contact',
    label: 'First Contact',
    description: 'Star Trek VIII -- tons de mauve e cobre'
  },
  {
    id: 'nemesis',
    label: 'Nemesis',
    description: 'Star Trek X -- tons frios de azul'
  },
  {
    id: 'enterprise-nx01',
    label: 'Enterprise (NX-01)',
    description: 'Star Trek: Enterprise -- paleta clara e lavada'
  },
  {
    id: '29th-century',
    label: 'Século XXIX',
    description: 'Paleta futurista, ciano e dourado'
  },
  {
    id: '23rd-century',
    label: 'Século XXIII',
    description: 'Paleta vívida, verde e azul saturados'
  },
  {
    id: 'picard',
    label: 'Picard',
    description: 'Star Trek: Picard -- cinza-azulado com destaque laranja'
  }
]

const STORAGE_KEY = 'sst-lcars:theme'

const readStoredTheme = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'tos'
  } catch {
    return 'tos'
  }
}

const activeTheme = ref(readStoredTheme())

// Mesmo padrao do watch de red-alert em SituationPanel.vue (mutar um
// atributo/classe do document e deixar o CSS cuidar do resto) -- so que em
// dataset.theme em vez de classList, e no mesmo elemento (document.body)
// que ja hospeda .red-alert, pra permitir o seletor composto
// [data-theme].red-alert em colors.css.
watch(
  activeTheme,
  (id) => {
    document.body.dataset.theme = id
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // localStorage bloqueado (aba anonima/sandbox) -- preferencia cai
      // pra memoria, nao quebra o app por causa de cosmetico
    }
  },
  { immediate: true }
)

export function useTheme() {
  const setTheme = (id: string) => {
    activeTheme.value = id
  }

  return { activeTheme, themes: THEMES, setTheme }
}
