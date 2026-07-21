import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EnterpriseShieldSvg from '@/components/elements/EnterpriseShieldSvg.vue'

const meta: Meta<typeof EnterpriseShieldSvg> = {
  title: 'Elements/EnterpriseShieldSvg',
  component: EnterpriseShieldSvg,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Nominal: Story = {
  args: {
    shieldLevel: 2500,
    systemIntegrity: {
      warp: 100, srs: 100, lrs: 100, phasers: 100, photons: 100, shields: 100, damage: 100, life: 100,
    },
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 500px; background: #000;"><story /></div>',
    }),
  ],
}

export const DamagedZones: Story = {
  args: {
    shieldLevel: 900,
    systemIntegrity: {
      warp: 100, srs: 45, lrs: 100, phasers: 60, photons: 100, shields: 100, damage: 100, life: 100,
    },
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 500px; background: #000;"><story /></div>',
    }),
  ],
}

export const WarpEnginesOffline: Story = {
  args: {
    shieldLevel: 200,
    systemIntegrity: {
      warp: 0, srs: 100, lrs: 100, phasers: 100, photons: 100, shields: 30, damage: 100, life: 100,
    },
  },
  decorators: [
    () => ({
      template: '<div style="width: 100%; height: 500px; background: #000;"><story /></div>',
    }),
  ],
}
