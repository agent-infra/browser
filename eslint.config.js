/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
const js = require('@eslint/js');
const typescript = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const react = require('eslint-plugin-react');
const importPlugin = require('eslint-plugin-import');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'out/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
    ],
  },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx,ts,tsx,cjs,mjs,cts,mts}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-shadow': 'off',

      'react/display-name': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/destructuring-assignment': 'off',
      'react/jsx-filename-extension': 'off',
      'react/require-default-props': 'off',
      'react/function-component-definition': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/prop-types': 'off',

      'import/no-extraneous-dependencies': 'off',
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      'import/no-import-module-exports': 'off',
      'import/order': 'off',
      'import/prefer-default-export': 'off',

      camelcase: 'off',
      'no-shadow': 'off',
      'class-methods-use-this': 'off',
      'no-unused-vars': 'off',
      'no-restricted-syntax': 'off',
      'no-case-declarations': 'off',
      'no-await-in-loop': 'off',
      'no-empty': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
