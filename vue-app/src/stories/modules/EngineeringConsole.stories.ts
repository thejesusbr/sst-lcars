import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EngineeringConsole from '@/components/modules/EngineeringConsole.vue'

const meta: Meta<typeof EngineeringConsole> = {
  title: 'Modules/EngineeringConsole',
  component: EngineeringConsole,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    initialEnergy: { control: { type: 'number', min: 0, max: 4500 } },
    warpIntegrity: { control: { type: 'number', min: 0, max: 100 } },
    srsIntegrity: { control: { type: 'number', min: 0, max: 100 } },
    lrsIntegrity: { control: { type: 'number', min: 0, max: 100 } },
    phaserIntegrity: { control: { type: 'number', min: 0, max: 100 } },
    photonIntegrity: { control: { type: 'number', min: 0, max: 100 } },
    shieldIntegrity: { control: { type: 'number', min: 0, max: 100 } },
    damageIntegrity: { control: { type: 'number', min: 0, max: 100 } },
    lifeIntegrity: { control: { type: 'number', min: 0, max: 100 } },
    warpCoreIntegrity: { control: { type: 'number', min: 0, max: 100 } },
  }
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    initialEnergy: 4500,
    warpIntegrity: 100,
    srsIntegrity: 100,
    lrsIntegrity: 100,
    phaserIntegrity: 100,
    photonIntegrity: 100,
    shieldIntegrity: 100,
    damageIntegrity: 100,
    lifeIntegrity: 100,
    warpCoreIntegrity: 100,
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; min-height: 600px; background: #000; padding: 2rem; box-sizing: border-box;"><story /></div>',
    }),
  ],
}

export const DamagedSystems: Story = {
  args: {
    initialEnergy: 3200,
    warpIntegrity: 45,
    srsIntegrity: 100,
    lrsIntegrity: 0,
    phaserIntegrity: 80,
    photonIntegrity: 100,
    shieldIntegrity: 0,
    damageIntegrity: 100,
    lifeIntegrity: 100,
    warpCoreIntegrity: 60,
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; min-height: 600px; background: #000; padding: 2rem; box-sizing: border-box;"><story /></div>',
    }),
  ],
}
