import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsColumn from '@/components/elements/LcarsColumn.vue'
import LcarsBar from '@/components/elements/LcarsBar.vue'

const meta: Meta<typeof LcarsColumn> = {
  title: 'Elements/LcarsColumn',
  component: LcarsColumn,
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
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    flex: 'v',
    style: { width: '100px', height: '200px' },
  },
  render: (args) => ({
    components: { LcarsColumn, LcarsBar },
    setup() {
      return { args }
    },
    template: `
      <LcarsColumn v-bind="args">
        <LcarsBar color="pale-canary-bg" />
        <LcarsBar color="golden-tanoi-bg" />
        <LcarsBar color="lilac-bg" />
      </LcarsColumn>
    `,
  }),
}

export const FlexGrow: Story = {
  args: {
    flex: 'v',
    flexc: 'h',
  },
  decorators: [
    () => ({
      template: '<div style="display: flex; width: 400px; height: 200px;"><story /></div>',
    }),
  ],
  render: (args) => ({
    components: { LcarsColumn, LcarsBar },
    setup() {
      return { args }
    },
    template: `
      <LcarsColumn v-bind="args">
        <LcarsBar color="pale-canary-bg" flexc="v" />
        <LcarsBar color="golden-tanoi-bg" flexc="v" />
      </LcarsColumn>
    `,
  }),
}
