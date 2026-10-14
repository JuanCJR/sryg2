import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig } from 'eslint/config'
import { baseConfig } from '../../eslint.config.js'

// Every feature folder this change plans (see design.md "Feature layout and demo-data
// contract"). A feature must never import a sibling feature directly; cross-feature
// navigation goes through src/app/routes.ts. Add a name here when a new feature folder
// is created under src/features/.
const FEATURE_NAMES = [
  'auth',
  'alerts',
  'personnel',
  'licenses',
  'medical-certificates',
  'blocking',
  'reports',
  'audit',
  'users',
  'settings',
  'catalogs',
  'credentials',
]
// The one cross-feature export (F0-B): the catalog selector the wave-1 forms share.
const FEATURE_SIBLING_PATTERNS = [...FEATURE_NAMES.map((name) => `../../${name}/**`), '!../../catalogs/CatalogSelect']

export default defineConfig([
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Templates and the design system are permission-blind and backend-blind: they
    // receive data through props/slots and never read features.
    files: ['src/app/templates/**/*.{ts,tsx}', 'src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/features/**'], message: 'Templates and the design system must not import src/features/**.' },
          ],
        },
      ],
    },
  },
  {
    // Only a feature's containers (and Expediente slots) may import its data module;
    // components, pages and domain receive data as props instead.
    files: ['src/features/*/{components,pages,domain}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/**'],
              message: 'Only containers/ may import data/**. Receive data as props instead.',
            },
            {
              group: FEATURE_SIBLING_PATTERNS,
              message:
                'Features must not import sibling features. Route cross-feature navigation through src/app/routes.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // containers/, data/ and the Expediente slots (expediente/, containers of one tab or one
    // header action) may import their own data module, but must not reach into a sibling feature.
    files: ['src/features/*/{containers,data,expediente}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: FEATURE_SIBLING_PATTERNS,
              message:
                'Features must not import sibling features. Route cross-feature navigation through src/app/routes.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // Test helpers render providers and probes; Fast Refresh does not apply to them.
    files: ['src/test/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
