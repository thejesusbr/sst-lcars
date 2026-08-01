import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsIndicator from '@/components/elements/LcarsIndicator.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'

const meta: Meta<typeof LcarsIndicator> = {
  title: 'Elements/LcarsIndicator',
  component: LcarsIndicator,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['primary-interactive', 'secondary-interactive', 'tertiary-interactive', 'golden-tanoi-bg', 'caribbean-green-bg', 'alert-bg'],
    },
    textColor: {
      control: 'select',
      options: [undefined, 'text-light', 'text-dark', 'text-white', 'text-primary', 'text-secondary', 'text-tertiary', 'text-highlight'],
    },
    decorator: {
      control: 'select',
      options: ['left', 'right', 'none'],
    },
    size: {
      control: 'select',
      options: [undefined, 'small', 'large'],
    },
  },
  decorators: [
    () => ({
      template: '<div style="width: 300px; background: #000; padding: 1rem;"><story /></div>',
    }),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    text: '1234',
    color: 'secondary-interactive',
    decorator: 'left',
  },
}

export const DecoratorRight: Story = {
  args: {
    text: '1234',
    color: 'secondary-interactive',
    decorator: 'right',
  },
}

export const NoDecorator: Story = {
  args: {
    text: '1234',
    decorator: 'none',
  },
}

export const Small: Story = {
  args: {
    text: '12',
    color: 'secondary-interactive',
    decorator: 'left',
    size: 'small',
  },
}

export const Large: Story = {
  args: {
    text: '1234567890',
    color: 'secondary-interactive',
    decorator: 'left',
    size: 'large',
  },
}

/**
 * Pegada base contra `LcarsButton` e `LcarsBlock`, igual o
 * `LcarsToggleSwitch.stories.ts` — mesma altura e largura base (7.5rem),
 * nenhum leva `width`/`flex` manual.
 */
export const GridAlignment: Story = {
  render: () => ({
    components: { LcarsIndicator, LcarsButton, LcarsBlock },
    template: `
      <div style="background:#000; padding:1rem; display:flex; flex-direction:column; gap:0.5rem;">
        <div style="display:flex; gap:0.25rem; outline:1px solid red;">
          <LcarsButton label="Button" color="primary-interactive" />
          <LcarsIndicator text="1234" color="highlight-interactive" decorator="left" />
          <LcarsBlock label="Block" color="secondary-interactive" />
        </div>
        <div style="display:flex; gap:0.25rem; outline:1px solid red;">
          <LcarsIndicator text="12" color="highlight-interactive" decorator="left" size="small" />
          <LcarsIndicator text="3456" color="highlight-interactive" decorator="left" />
          <LcarsIndicator text="7890123" color="highlight-interactive" decorator="left" size="large" />
        </div>
      </div>
    `,
  }),
}

/**
 * Cor de PAPEL (`-interactive`, cascateia fundo sólido pro container) no
 * decorator, pra caçar o bug já visto no `LcarsToggleSwitch`: se a ROW
 * também pintar o fundo com a mesma cor, o decorator vira um buraco invisível
 * contra o próprio fundo.
 *
 * Sem `textColor`, o texto também cai no papel `-interactive` — que só pinta
 * fundo, não define `color`, então aparece um destaque atrás dos dígitos.
 * Serve pra deixar claro na tela POR QUE se recomenda `textColor` explícito
 * (`text-light`/`text-primary`/etc) sempre que `color` for um papel de bloco.
 */
export const PapelColorStressTest: Story = {
  args: {
    text: '5500',
    color: 'primary-interactive',
    decorator: 'left',
  },
}

/**
 * Decorator e texto em cores DIFERENTES — o caso visto em vários indicadores
 * da série de referência, e o motivo de `textColor` existir em vez de
 * `color` sozinho decidir os dois.
 */
export const TextColorOverride: Story = {
  args: {
    text: '5500',
    color: 'highlight-interactive',
    textColor: 'text-secondary',
    decorator: 'left',
  },
}

/**
 * `color` sozinho, sem `textColor` e sem decorator — o fallback puro: o
 * texto usa o MESMO valor passado em `color`. Só funciona bem sem conflito
 * quando `color` já é um valor de cor-de-texto (`text-X`); combinado com um
 * decorator, normalmente se quer `color` (papel, fundo) + `textColor`
 * (`text-X`, cor) explícitos — ver `TextColorOverride`.
 */
export const TextColorDefaultsToColor: Story = {
  args: {
    text: '5500',
    color: 'text-secondary',
    decorator: 'none',
  },
}
