const js = require('@eslint/js');

const nodeGlobals = {
  Buffer: 'readonly',
  AbortController: 'readonly',
  Blob: 'readonly',
  FormData: 'readonly',
  TextDecoder: 'readonly',
  __dirname: 'readonly',
  console: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  fetch: 'readonly',
  module: 'readonly',
  process: 'readonly',
  require: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
};

const jestGlobals = {
  afterAll: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  beforeEach: 'readonly',
  describe: 'readonly',
  expect: 'readonly',
  it: 'readonly',
  jest: 'readonly',
  test: 'readonly',
};

module.exports = [
  {
    ignores: ['coverage/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
  },
  {
    files: ['tests/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...nodeGlobals,
        ...jestGlobals,
      },
    },
  },
];
