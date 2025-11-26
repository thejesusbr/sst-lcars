import type { Meta, StoryObj } from '@storybook/vue3-vite'
import LcarsHtmlTag from '@/components/elements/LcarsHtmlTag.vue'

const meta: Meta<typeof LcarsHtmlTag> = {
  title: 'Elements/LcarsHtmlTag',
  component: LcarsHtmlTag,
  tags: ['autodocs'],
  argTypes: {
    tag: {
      control: 'select',
      options: ['div', 'span', 'section', 'article', 'aside', 'header', 'footer'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Div: Story = {
  args: {
    tag: 'div',
    style: { padding: '20px', backgroundColor: '#fc6', color: '#000' },
  },
  render: (args) => ({
    components: { LcarsHtmlTag },
    setup() {
      return { args }
    },
    template: `
      <LcarsHtmlTag v-bind="args">
        Content inside a div
      </LcarsHtmlTag>
    `,
  }),
}

export const Section: Story = {
  args: {
    tag: 'section',
    style: { padding: '20px', backgroundColor: '#c9c', color: '#000' },
  },
  render: (args) => ({
    components: { LcarsHtmlTag },
    setup() {
      return { args }
    },
    template: `
      <LcarsHtmlTag v-bind="args">
        Content inside a section
      </LcarsHtmlTag>
    `,
  }),
}
