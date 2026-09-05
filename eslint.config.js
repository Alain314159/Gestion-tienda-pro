import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import svelteParser from 'svelte-eslint-parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser
    }
  },
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'warn',
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn'
    }
  },
  {
    ignores: ['dist/', 'node_modules/', '.svelte-kit/']
  }
];
