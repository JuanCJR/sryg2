import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Shared flat-config base. Workspaces extend it (see apps/web/eslint.config.js).
export const baseConfig = defineConfig([
  globalIgnores(['**/dist', '**/coverage', '**/node_modules', '.claude/']),
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
])

// Hexagonal boundary for apps/api feature modules (design D4): domain and application
// layers must stay framework-free. Prepared here, activated by apps/api in PR3 by
// spreading it into its own config.
export const apiLayerBoundaries = {
  files: ['src/*/{domain,application}/**/*.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: ['@nestjs/*'], message: 'domain/application must not depend on NestJS.' },
          { group: ['drizzle-orm', 'drizzle-orm/*'], message: 'domain/application must not depend on drizzle-orm.' },
          { group: ['@sryg/db', '@sryg/db/*'], message: 'domain/application must not depend on @sryg/db.' },
        ],
      },
    ],
  },
}

export default baseConfig
