import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import LcarsToggleSwitch from '@/components/elements/LcarsToggleSwitch.vue'
import LcarsButton from '@/components/elements/LcarsButton.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'

const meta: Meta<typeof LcarsToggleSwitch> = {
  title: 'Elements/LcarsToggleSwitch',
  component: LcarsToggleSwitch,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['primary-interactive', 'secondary-interactive', 'tertiary-interactive', 'golden-tanoi-bg', 'caribbean-green-bg', 'alert-bg'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Interactive: Story = {
  args: {
    modelValue: false,
    color: 'secondary-interactive',
    onLabel: 'on',
    offLabel: 'off',
  },
  render: (args) => ({
    components: { LcarsToggleSwitch },
    setup() {
      const value = ref(args.modelValue)
      return { args, value }
    },
    template: `
      <div style="width: 200px; background: #000; padding: 1rem;">
        <LcarsToggleSwitch v-bind="args" v-model="value" />
      </div>
    `,
  }),
}

export const On: Story = {
  args: {
    modelValue: true,
    color: 'secondary-interactive',
  },
  decorators: [
    () => ({
      template: '<div style="width: 200px; background: #000; padding: 1rem;"><story /></div>',
    }),
  ],
}

export const Off: Story = {
  args: {
    modelValue: false,
    color: 'secondary-interactive',
  },
  decorators: [
    () => ({
      template: '<div style="width: 200px; background: #000; padding: 1rem;"><story /></div>',
    }),
  ],
}

/**
 * Pegada base contra `LcarsButton` e `LcarsBlock`.
 *
 * O LCARS organiza um grid uniforme, e a base deste projeto é a de
 * `module.css`: `.block, .button { min-width: 7.5rem; min-height: 3rem }`.
 * `.complex-button` (root do toggle) não recebe esse override e ficava com os
 * 150px do `lcars-sdk`, mais largos que a base.
 *
 * Na linha de outline vermelho, os três elementos têm que ter a MESMA altura e
 * a MESMA largura base — nenhum deles leva `width` ou `flex`.
 */
export const GridAlignment: Story = {
  render: () => ({
    components: { LcarsToggleSwitch, LcarsButton, LcarsBlock },
    setup() {
      return { value: ref(true) }
    },
    template: `
      <div style="background:#000; padding:1rem; display:flex; flex-direction:column; gap:0.5rem;">
        <div style="display:flex; gap:0.25rem; outline:1px solid red;">
          <LcarsButton label="Button" color="primary-interactive" />
          <LcarsToggleSwitch v-model="value" color="highlight-interactive" />
          <LcarsBlock label="Block" color="secondary-interactive" />
        </div>
        <div style="display:flex; gap:0.25rem; outline:1px solid red;">
          <LcarsToggleSwitch :model-value="false" color="highlight-interactive" />
          <LcarsToggleSwitch :model-value="true" color="highlight-interactive" />
        </div>
      </div>
    `,
  }),
}
