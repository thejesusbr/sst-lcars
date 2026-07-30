import type { Preview } from "@storybook/vue3-vite";
import { setup } from "@storybook/vue3-vite";
import { createPinia, getActivePinia, setActivePinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import '../src/assets/css/colors.css';
import '../src/assets/css/lcars-sdk.css';
import '../src/assets/css/theme.css';
import '../src/assets/css/module.css';
import '../src/assets/css/widgets.css';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
setActivePinia(pinia);

setup((app) => {
  if (!getActivePinia()) {
    setActivePinia(pinia);
  }
  app.use(pinia);
});

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'lcars-dark',
      values: [
        { name: 'lcars-dark', value: '#000000' },
        { name: 'white', value: '#ffffff' },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
