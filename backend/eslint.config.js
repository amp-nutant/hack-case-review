import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];

