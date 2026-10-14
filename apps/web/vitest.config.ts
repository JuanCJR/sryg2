import { defineConfig } from 'vitest/config'

export default defineConfig({
  // @sryg/types ships TS source behind this condition (no build step needed for tests).
  resolve: { conditions: ['@sryg/source'] },
  ssr: { resolve: { conditions: ['@sryg/source'] } },
  test: {
    // Pure modules run in node; component tests opt into jsdom with `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
