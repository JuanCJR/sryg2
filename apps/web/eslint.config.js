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
  'validation-blocking',
  'reports',
  'audit',
  'users',
  'settings',
]
const FEATURE_SIBLING_PATTERNS = FEATURE_NAMES.map((name) => `../../${name}/**`)

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
    // receive data through props/slots and never read features or the demo kernel.
    files: ['src/app/templates/**/*.{ts,tsx}', 'src/design-system/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/features/**'], message: 'Templates and the design system must not import src/features/**.' },
            { group: ['**/demo/**'], message: 'Templates and the design system must not import src/demo/**.' },
          ],
        },
      ],
    },
  },
  {
    // Only a feature's containers may import its data module or the demo kernel;
    // components/pages/domain receive data as props instead.
    files: ['src/features/*/{components,pages,domain}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/**'],
              message: 'Only containers/ may import data/demoData.ts. Receive data as props instead.',
            },
            {
              group: ['**/demo/**'],
              message: 'Only containers/ may import src/demo/**. Receive data as props instead.',
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
    // containers/ and data/ may import the demo kernel and their own data module,
    // but still must not reach into a sibling feature directly.
    files: ['src/features/*/{containers,data}/**/*.{ts,tsx}'],
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
])
