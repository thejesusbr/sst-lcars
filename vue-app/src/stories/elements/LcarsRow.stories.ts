import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsRow from '@/components/elements/LcarsRow.vue'
import LcarsBar from '@/components/elements/LcarsBar.vue'

const meta: Meta<typeof LcarsRow> = {
  title: 'Elements/LcarsRow',
  component: LcarsRow,
  tags: ['autodocs'],
  argTypes: {
    flex: {
      control: 'select',
      options: ['v', 'h'],
    },
    flexc: {
      control: 'select',
      options: ['v', 'h'],
    },
    version: {
      control: 'select',
      options: ['frame'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    flex: 'h',
    style: { width: '400px' },
  },
  render: (args) => ({
    components: { LcarsRow, LcarsBar },
    setup() {
      return { args }
    },
    template: `
      <LcarsRow v-bind="args">
        <LcarsBar color="pale-canary-bg" :style="{ width: '100px' }" />
        <LcarsBar color="golden-tanoi-bg" :style="{ width: '100px' }" />
        <LcarsBar color="lilac-bg" :style="{ width: '100px' }" />
      </LcarsRow>
    `,
  }),
}

export const Frame: Story = {
  args: {
    flex: 'h',
    version: 'frame',
    style: { width: '400px', padding: '0 0.25rem' },
  },
  render: (args) => ({
    components: { LcarsRow, LcarsBar },
    setup() {
      return { args }
    },
    template: `
      <LcarsRow v-bind="args">
        <LcarsBar color="pale-canary-bg" :style="{ width: '100px' }" />
        <LcarsBar color="golden-tanoi-bg" flexc="h" />
      </LcarsRow>
    `,
  }),
}

export const FlexGrow: Story = {
  args: {
    flex: 'h',
    flexc: 'v',
  },
  decorators: [
    () => ({
      template: '<div style="display: flex; flex-direction: column; width: 400px; height: 200px;"><story /></div>',
    }),
  ],
  render: (args) => ({
    components: { LcarsRow, LcarsBar },
    setup() {
      return { args }
    },
    template: `
      <LcarsRow v-bind="args">
        <LcarsBar color="pale-canary-bg" flexc="h" />
        <LcarsBar color="golden-tanoi-bg" flexc="h" />
      </LcarsRow>
    `,
  }),
}
