import { useCallback, useEffect, useState } from 'react'

/**
 * The shape a container gets its data through: the same three states every template renders
 * (loading, error with retry, ready).
 */
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown; retry: () => void }
  | { status: 'ready'; data: T; retry: () => void }

type Settled<T> = { key: string; nonce: number } & ({ status: 'ready'; data: T } | { status: 'error'; error: unknown })

/**
 * Runs `load` whenever `key` changes (or on retry) and exposes its result as a `Resource`.
 * `key` must identify everything `load` depends on; `null` means "nothing to load yet" (loading).
 * A result for an older key or attempt is ignored, so a slow response never overwrites a newer one.
 */
export function useApiResource<T>(key: string | null, load: () => Promise<T>): Resource<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  // Captured per key: the effect below re-runs on key/nonce, never on a new closure identity.
  const [loader, setLoader] = useState(() => ({ key, load }))
  if (loader.key !== key) setLoader({ key, load })

  useEffect(() => {
    if (loader.key === null) return
    let cancelled = false
    const current = { key: loader.key, nonce }
    loader.load().then(
      (data) => !cancelled && setSettled({ ...current, status: 'ready', data }),
      (error: unknown) => !cancelled && setSettled({ ...current, status: 'error', error }),
    )
    return () => {
      cancelled = true
    }
  }, [loader, nonce])

  const retry = useCallback(() => setNonce((n) => n + 1), [])

  if (key === null || !settled || settled.key !== key || settled.nonce !== nonce) return { status: 'loading' }
  if (settled.status === 'error') return { status: 'error', error: settled.error, retry }
  return { status: 'ready', data: settled.data, retry }
}
