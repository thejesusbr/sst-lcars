import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import LcarsToggleSwitch from '@/components/elements/LcarsToggleSwitch.vue'

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
