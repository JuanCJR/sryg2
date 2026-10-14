import react from '@vitejs/plugin-react'
import { defaultClientConditions, defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // @sryg/types ships TS source behind this condition (no build step needed in dev/test).
  resolve: { conditions: [...defaultClientConditions, '@sryg/source'] },
})
