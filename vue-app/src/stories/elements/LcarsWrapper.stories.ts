import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsWrapper from '@/components/elements/LcarsWrapper.vue'
import LcarsBar from '@/components/elements/LcarsBar.vue'

const meta: Meta<typeof LcarsWrapper> = {
  title: 'Elements/LcarsWrapper',
  component: LcarsWrapper,
  tags: ['autodocs'],
  argTypes: {
    version: {
      control: 'select',
      options: ['row', 'column'],
    },
    flex: {
      control: 'select',
      options: ['v', 'h'],
    },
    flexc: {
      control: 'select',
      options: ['v', 'h'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Row: Story = {
  args: {
    version: 'row',
    flex: 'h',
    style: { width: '400px' },
  },
  render: (args) => ({
    components: { LcarsWrapper, LcarsBar },
    setup() {
      return { args }
    },
    template: `
      <LcarsWrapper v-bind="args">
        <LcarsBar color="pale-canary-bg" :style="{ width: '100px' }" />
        <LcarsBar color="golden-tanoi-bg" :style="{ width: '100px' }" />
      </LcarsWrapper>
    `,
  }),
}

export const Column: Story = {
  args: {
    version: 'column',
    flex: 'v',
    style: { width: '100px', height: '200px' },
  },
  render: (args) => ({
    components: { LcarsWrapper, LcarsBar },
    setup() {
      return { args }
    },
    template: `
      <LcarsWrapper v-bind="args">
        <LcarsBar color="pale-canary-bg" />
        <LcarsBar color="golden-tanoi-bg" />
      </LcarsWrapper>
    `,
  }),
}
