import { useSearchParams } from 'react-router'

/**
 * Reads `?estado=` and returns it only when it is in the caller's own
 * allow-list (per-page, e.g. `['cargando', 'error', 'vacio']`). Any other
 * value — including one valid for a different page — is ignored.
 */
export function useDemoStateOverride<K extends string>(allowed: readonly K[]): K | null {
  const [searchParams] = useSearchParams()
  const value = searchParams.get('estado')
  return value && (allowed as readonly string[]).includes(value) ? (value as K) : null
}
