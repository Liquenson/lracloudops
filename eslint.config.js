import eslintPluginAstro from 'eslint-plugin-astro'
import tsParser from '@typescript-eslint/parser'

export default [
  ...eslintPluginAstro.configs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
  {
    rules: {
      'no-unused-vars': 'warn',
    },
  },
]
