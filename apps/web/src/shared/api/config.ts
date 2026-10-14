export const DEV_API_URL = 'http://localhost:3000'

interface ApiEnv {
  VITE_API_URL?: string
  DEV?: boolean
}

/** Resolves the API base URL. Never throws: the web app still builds and runs without an API (demo data). */
export function resolveApiUrl(env: ApiEnv): string | undefined {
  const raw = env.VITE_API_URL?.trim()
  if (raw) return raw.replace(/\/+$/, '')
  return env.DEV ? DEV_API_URL : undefined
}

/** Undefined when VITE_API_URL is unset in production; fetchJson fails clearly in that case. */
export const API_URL = resolveApiUrl(import.meta.env)
