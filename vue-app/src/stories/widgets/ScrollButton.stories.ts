import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ScrollButton from '@/components/widgets/ScrollButton.vue'

const meta: Meta<typeof ScrollButton> = {
  title: 'Widgets/ScrollButton',
  component: ScrollButton,
  tags: ['autodocs'],
  argTypes: {
    version: { control: 'select', options: ['vertical', 'horizontal'] },
    reverse: { control: 'boolean' },
    color: { control: 'select', options: ['pale-canary-bg', 'golden-tanoi-bg', 'lilac-bg', 'rust-bg', 'tanoi-bg', 'neon-carrot-bg', 'orange-peel-bg'] },
    amount: { control: 'number' },
    page: { control: 'number' }
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Vertical: Story = {
  render: (args) => ({
    components: { ScrollButton },
    setup() {
      return { args }
    },
    template: `
      <div style="display: flex; gap: 20px; align-items: flex-start;">
        <div id="scroll-target-v" style="height: 200px; width: 300px; overflow-y: auto; border: 1px solid #333; padding: 10px; color: white;">
          <div style="height: 600px; background: linear-gradient(180deg, #111, #333, #555, #777);">
            <p>Scrollable Area (Vertical)</p>
            <p style="margin-top: 100px;">Middle Section</p>
            <p style="margin-top: 200px;">End Section</p>
          </div>
        </div>
        <ScrollButton v-bind="args" target="#scroll-target-v" />
      </div>
    `
  }),
  args: {
    version: 'vertical',
    color: 'golden-tanoi-bg',
    amount: 50,
    style: { height: '200px', width: '80px' }
  }
}

export const Horizontal: Story = {
  render: (args) => ({
    components: { ScrollButton },
    setup() {
      return { args }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div id="scroll-target-h" style="height: 100px; width: 400px; overflow-x: auto; border: 1px solid #333; padding: 10px; color: white; white-space: nowrap;">
          <div style="width: 1000px; height: 100%; background: linear-gradient(90deg, #111, #333, #555, #777); padding: 10px;">
            <span>Scrollable Area (Horizontal) ------------------------------------------------------------- Middle ------------------------------------------------------- End</span>
          </div>
        </div>
        <ScrollButton v-bind="args" target="#scroll-target-h" />
      </div>
    `
  }),
  args: {
    version: 'horizontal',
    color: 'pale-canary-bg',
    amount: 100,
    style: { height: '30px', width: '400px' }
  }
}

export const VerticalPageScroll: Story = {
  render: (args) => ({
    components: { ScrollButton },
    setup() {
      return { args }
    },
    template: `
      <div style="display: flex; gap: 20px; align-items: flex-start;">
        <div id="scroll-target-page" style="height: 200px; width: 300px; overflow-y: auto; border: 1px solid #333; padding: 10px; color: white;">
          <div style="height: 600px; background: linear-gradient(180deg, #111, #333, #555, #777);">
            <p>Page 1</p>
            <p style="margin-top: 150px;">Page 2</p>
            <p style="margin-top: 150px;">Page 3</p>
          </div>
        </div>
        <ScrollButton v-bind="args" target="#scroll-target-page" />
      </div>
    `
  }),
  args: {
    version: 'vertical',
    color: 'lilac-bg',
    page: 1.0,
    style: { height: '200px', width: '80px' }
  }
}
