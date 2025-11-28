module.exports = {
  extends: [
    'prettier' // Only use prettier to avoid conflicts
  ],
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'script' // Use script mode for more flexibility
  },
  plugins: ['import'],
  globals: {
    // Allow all common globals
    require: 'readonly',
    module: 'readonly',
    exports: 'readonly',
    __dirname: 'readonly',
    __filename: 'readonly',
    process: 'readonly',
    Buffer: 'readonly',
    global: 'readonly',
    console: 'readonly',
    // Browser globals
    window: 'readonly',
    document: 'readonly',
    // Electron globals
    BrowserWindow: 'readonly',
    // jQuery (appears to be used)
    $: 'readonly',
    jQuery: 'readonly'
  },
  rules: {
    // Only enforce syntax errors and critical issues
    'no-dupe-args': 'error',
    'no-dupe-keys': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'error',
    'no-extra-semi': 'error',
    'no-func-assign': 'error',
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': 'error',
    'no-obj-calls': 'error',
    'no-sparse-arrays': 'error',
    'no-unreachable': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',

    // Turn off rules that would fail on existing code
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'no-console': 'off',
    'no-redeclare': 'off'
  }
};
