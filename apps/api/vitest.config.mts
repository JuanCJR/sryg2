import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

// SWC keeps decorator metadata, which Nest dependency injection needs (esbuild drops it).
export default defineConfig({
  resolve: { conditions: ['@sryg/source'] },
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],

    fileParallelism: false,
  },
})
