import jsxA11yPlugin from 'eslint-plugin-jsx-a11y'
import reactHooksPlugin from 'eslint-plugin-react-hooks'
import importPlugin from 'eslint-plugin-import'
import tsParser from '@typescript-eslint/parser'
import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'

import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'
import reactRecommended from 'eslint-plugin-react/configs/recommended.js'
import reactJsxRuntime from 'eslint-plugin-react/configs/jsx-runtime.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'bin/**',
      'build/**',
      'test-results/**',
      'playwright-report/**',
      '.turbo/**',
      // TODO: figure out why tsconfig isn't picking these up, and lint them
      // but for now there's only 2 files in there, so 🤷‍♂️
      '.storybook/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,cjs,mjs}'],
    rules: {
      ...js.configs.recommended.rules,
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { modules: true, jsx: true },
        ecmaVersion: 'latest',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      import: importPlugin,
      '@typescript-eslint': tsPlugin,
    },
    settings: {
      'import/internal-regex': '^~/',
      'import/resolver': {
        node: {
          extensions: ['.ts', '.tsx'],
        },
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      ...tsPlugin.configs['eslint-recommended'].rules,
      ...tsPlugin.configs['recommended-type-checked'].rules,
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
        },
      ],
    },
  },

  {
    // TODO: delete once fully migrated
    files: ['.eslintrc.cjs'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
      },
    },
  },
  {
    // React
    files: ['**/*.{js,jsx,ts,tsx}'],
    ...reactRecommended,
    ...reactJsxRuntime,
    languageOptions: {
      ...reactRecommended.languageOptions,
      ...reactJsxRuntime.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.serviceWorker,
      },
    },
  },
  {
    // React hooks
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'jsx-a11y': jsxA11yPlugin,
    },
    rules: {
      ...jsxA11yPlugin.configs.recommended.rules,
    },
    settings: {
      formComponents: ['Form'],
      linkComponents: [
        { name: 'Link', linkAttribute: 'to' },
        { name: 'NavLink', linkAttribute: 'to' },
      ],
      'import/resolver': {
        typescript: {},
      },
    },
  },
  prettierConfig,
  // {
  //   // React
  //   files: ['**/*.{js,jsx,ts,tsx}'],
  //   plugins: {
  //     react,
  //   },
  // },
  // prettierConfig,
  // {
  // },
  // ...compat.config({
  //   root: true,
  //   parserOptions: {
  //     ecmaVersion: 'latest',
  //     sourceType: 'module',
  //     ecmaFeatures: {
  //       jsx: true,
  //     },
  //   },
  //   env: {
  //     browser: true,
  //     commonjs: true,
  //     es6: true,
  //   },
  //   // Base config
  //   extends: ['eslint:recommended', 'prettier', 'plugin:storybook/recommended'],
  //   rules: {
  //     // warn on console logs, but not console errors or warnings
  //     'no-console': ['warn', { allow: ['error', 'warn'] }],
  //   },
  //   overrides: [
  //     // React
  //     {
  //       files: ['**/*.{js,jsx,ts,tsx}'],
  //       plugins: ['react', 'jsx-a11y'],
  //       extends: [
  //         'plugin:react/recommended',
  //         'plugin:react/jsx-runtime',
  //         'plugin:react-hooks/recommended',
  //         'plugin:jsx-a11y/recommended',
  //       ],
  //       settings: {
  //         react: {
  //           version: 'detect',
  //         },
  //         formComponents: ['Form'],
  //         linkComponents: [
  //           { name: 'Link', linkAttribute: 'to' },
  //           { name: 'NavLink', linkAttribute: 'to' },
  //         ],
  //         'import/resolver': {
  //           typescript: {},
  //         },
  //       },
  //     },
  //     // Typescript
  //     {
  //       files: ['**/*.{ts,tsx}'],
  //       plugins: ['@typescript-eslint', 'import'],
  //       parser: '@typescript-eslint/parser',
  //       parserOptions: {
  //         project: true,
  //         tsconfigRootDir: __dirname,
  //       },
  //       settings: {
  //         'import/internal-regex': '^~/',
  //         'import/resolver': {
  //           node: {
  //             extensions: ['.ts', '.tsx'],
  //           },
  //           typescript: {
  //             alwaysTryTypes: true,
  //           },
  //         },
  //       },
  //       extends: [
  //         'plugin:@typescript-eslint/recommended-type-checked',
  //         'plugin:import/recommended',
  //         'plugin:import/typescript',
  //       ],
  //       rules: {
  //         'import/order': [
  //           'error',
  //           {
  //             groups: [
  //               'builtin',
  //               'external',
  //               'internal',
  //               'parent',
  //               'sibling',
  //               'index',
  //             ],
  //             'newlines-between': 'always',
  //             alphabetize: {
  //               order: 'asc',
  //               caseInsensitive: true,
  //             },
  //           },
  //         ],
  //         'sort-imports': [
  //           'error',
  //           {
  //             ignoreDeclarationSort: true,
  //           },
  //         ],
  //       },
  //     },
  //     // Node
  //     {
  //       files: ['.eslintrc.cjs'],
  //       env: {
  //         node: true,
  //       },
  //     },
  //   ],
  // }),
]
