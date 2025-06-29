// ESLint configuration for TypeScript projects (ESLint v9+)
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.FlatConfig} */
export default [
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './tsconfig.json',
          './src/tsconfig.json',
          './src/code/tsconfig.json',
          './src/commands/tsconfig.json',
          './src/device/tsconfig.json',
          './src/distribution/tsconfig.json',
          './src/link/tsconfig.json',
          './src/project/tsconfig.json',
          './src/util/tsconfig.json',
          './unit/tsconfig.json',
        ],
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    env: {
      es2021: true,
      node: true,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      indent: ['error', 4],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'double'],
      semi: ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'off',
      // Add or override more rules here
    },
  },
  {
    files: ['unit/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
];
