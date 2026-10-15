import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig } from 'eslint/config'
import { baseConfig } from '../../eslint.config.js'

// A page must never import a sibling page directly; cross-page navigation goes through
// src/routes.ts, and code shared by several pages lives in src/common/.
const PAGE_NAMES = readdirSync(join(import.meta.dirname, 'src/pages'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const RELATIVE_PREFIXES = ['../', '../../', '../../../', '../../../../']

const siblingPagePatterns = (page) =>
  PAGE_NAMES.filter((name) => name !== page).flatMap((name) => [
    `**/pages/${name}`,
    `**/pages/${name}/**`,
    ...RELATIVE_PREFIXES.flatMap((prefix) => [`${prefix}${name}`, `${prefix}${name}/**`]),
  ])

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
    // Shared code receives data through props/slots and never reads a page.
    files: ['src/common/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['**/pages', '**/pages/**'], message: 'src/common/** must not import src/pages/**.' }],
        },
      ],
    },
  },
  ...PAGE_NAMES.map((page) => ({
    files: [`src/pages/${page}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: siblingPagePatterns(page),
              message:
                'Pages must not import sibling pages. Route cross-page navigation through src/routes.ts and move shared code to src/common/.',
            },
          ],
        },
      ],
    },
  })),
  {
    // Test helpers render providers and probes; Fast Refresh does not apply to them.
    files: ['src/test/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
