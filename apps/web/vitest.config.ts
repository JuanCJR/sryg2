import { defineConfig } from 'vitest/config'

export default defineConfig({
  // @sryg/types ships TS source behind this condition (no build step needed for tests).
  resolve: { conditions: ['@sryg/source'] },
  ssr: { resolve: { conditions: ['@sryg/source'] } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
