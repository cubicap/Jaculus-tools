import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
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
        plugins: {
            '@typescript-eslint': tseslint.plugin,
        },
        rules: {
            indent: ['error', 4],
            'linebreak-style': ['error', 'unix'],
            quotes: ['error', 'double'],
            semi: ['error', 'always'],
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['unit/**/*.ts'],
        rules: {
            '@typescript-eslint/no-unused-expressions': 'off',
        },
    },
);
