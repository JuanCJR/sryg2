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

export default baseConfig
