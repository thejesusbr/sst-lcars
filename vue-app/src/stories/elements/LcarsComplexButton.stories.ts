import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsComplexButton from '@/components/elements/LcarsComplexButton.vue'
import LcarsCap from '@/components/elements/LcarsCap.vue'
import LcarsBlock from '@/components/elements/LcarsBlock.vue'
import LcarsText from '@/components/elements/LcarsText.vue'

const meta: Meta<typeof LcarsComplexButton> = {
  title: 'Elements/LcarsComplexButton',
  component: LcarsComplexButton,
  tags: ['autodocs'],
  argTypes: {
    color: {
      control: 'select',
      options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'],
    },
    version: {
      control: 'select',
      options: ['vertical', 'duo'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    color: 'pale-canary-bg',
  },
  render: (args) => ({
    components: { LcarsComplexButton, LcarsCap, LcarsBlock, LcarsText },
    setup() {
      return { args }
    },
    template: `
      <LcarsComplexButton v-bind="args">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Label" />
        <LcarsText text="1234" color="text-white" />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
    `,
  }),
}

export const WithLabel: Story = {
  args: {
    color: 'golden-tanoi-bg',
  },
  render: (args) => ({
    components: { LcarsComplexButton, LcarsCap, LcarsBlock, LcarsText },
    setup() {
      return { args }
    },
    template: `
      <LcarsComplexButton v-bind="args">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Energy" />
        <LcarsText text="4500" color="text-white" />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
    `,
  }),
}

export const LilacColor: Story = {
  args: {
    color: 'lilac-bg',
  },
  render: (args) => ({
    components: { LcarsComplexButton, LcarsCap, LcarsBlock, LcarsText },
    setup() {
      return { args }
    },
    template: `
      <LcarsComplexButton v-bind="args">
        <LcarsCap version="round-left" />
        <LcarsBlock label="Shields" />
        <LcarsText text="2500" color="text-white" />
        <LcarsCap version="round-right" />
      </LcarsComplexButton>
    `,
  }),
}
