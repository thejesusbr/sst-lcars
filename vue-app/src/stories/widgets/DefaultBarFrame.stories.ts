import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DefaultBarFrame from '@/components/widgets/DefaultBarFrame.vue'

const meta: Meta<typeof DefaultBarFrame> = {
  title: 'Widgets/DefaultBarFrame',
  component: DefaultBarFrame,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    altLabel: { control: 'text' },
    reverse: { control: 'boolean' },
    hidden: { control: 'boolean' },
    noEvent: { control: 'boolean' }
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => ({
    components: { DefaultBarFrame },
    setup() {
      return { args }
    },
    template: `
      <DefaultBarFrame v-bind="args">
        <div style="color: white; font-family: sans-serif; padding: 10px;">
          <h3>LCARS Default Bar Frame</h3>
          <p>Main content area inside the bar frame.</p>
        </div>
      </DefaultBarFrame>
    `
  }),
  args: {
    label: 'SYSTEM LOG',
    altLabel: 'DATA STREAM',
    style: { width: '600px', height: '350px' }
  }
}

export const Reverse: Story = {
  render: (args) => ({
    components: { DefaultBarFrame },
    setup() {
      return { args }
    },
    template: `
      <DefaultBarFrame v-bind="args">
        <div style="color: #ff9900; font-family: sans-serif; padding: 10px;">
          <h3>Reverse Frame Layout</h3>
          <p>This layout reverses the positions of elements.</p>
        </div>
      </DefaultBarFrame>
    `
  }),
  args: {
    label: 'NAVIGATION SYSTEM',
    altLabel: 'HELM CONSOLE',
    reverse: true,
    style: { width: '600px', height: '350px' }
  }
}

export const CustomColoring: Story = {
  render: (args) => ({
    components: { DefaultBarFrame },
    setup() {
      return { args }
    },
    template: `
      <DefaultBarFrame v-bind="args">
        <div style="color: white; font-family: sans-serif; padding: 10px;">
          <h3>Custom Coloring</h3>
          <p>Using different background and text colors for frame pieces.</p>
        </div>
      </DefaultBarFrame>
    `
  }),
  args: {
    label: 'ALERT STATUS',
    altLabel: 'RED ALERT ACTIVE',
    coloring: {
      headerCapLeft: 'rust-bg',
      headerCapRight: 'rust-bg',
      headerBar: 'orange-peel-bg',
      headerTitle: 'rust-text',
      footerCapLeft: 'orange-peel-bg',
      footerCapRight: 'orange-peel-bg',
      footerBar: 'rust-bg',
      footerTitle: 'orange-peel-text'
    },
    style: { width: '600px', height: '350px' }
  }
}

export const WithControls: Story = {
  render: (args) => ({
    components: { DefaultBarFrame },
    setup() {
      return { args }
    },
    template: `
      <DefaultBarFrame v-bind="args">
        <template #header-controls-before>
          <span style="color: #ff9900; font-size: 14px; margin-right: 5px;">02-534</span>
        </template>
        <template #header-controls-after>
          <span style="color: #ccddff; font-size: 14px; margin-left: 5px;">ONLINE</span>
        </template>
        <template #footer-controls-before>
          <span style="color: #ff3333; font-size: 14px; margin-right: 5px;">ERRORS: 0</span>
        </template>
        
        <div style="color: white; font-family: sans-serif; padding: 10px;">
          <h3>Frame with Header/Footer Controls</h3>
          <p>This frame uses slots for before/after labels/controls.</p>
        </div>
      </DefaultBarFrame>
    `
  }),
  args: {
    label: 'REACTOR CORE',
    altLabel: 'PRIMARY SYS',
    style: { width: '600px', height: '350px' }
  }
}
