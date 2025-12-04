// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'

export default [{
  name: 'app/files-to-lint',
  files: ['**/*.{ts,mts,tsx,vue}'],
}, {
  name: 'app/files-to-ignore',
  ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
}, ...pluginVue.configs['flat/essential'], ...vueTsEslintConfig(), ...storybook.configs["flat/recommended"]];
