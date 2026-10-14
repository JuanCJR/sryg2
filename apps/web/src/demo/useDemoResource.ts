import { useEffect, useRef, useState } from 'react'

/**
 * The shape a container gets its data through. This is the backend seam:
 * a future query hook returns the same shape, and nothing below the
 * container (components, templates) needs to change.
 */
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: T; retry: () => void; update: (fn: (current: T) => T) => void }

export interface UseDemoResourceOptions {
  /** Simulated network latency in ms. Defaults to 400, matching the Expediente's existing loader. */
  latencyMs?: number
  /** Stays loading forever, like the Expediente's `?estado=cargando`. */
  forceLoading?: boolean
  /** Resolves to the error frame instead of building data. */
  forceError?: boolean
}

type Settled<T> =
  { key: string; nonce: number; status: 'error' } | { key: string; nonce: number; status: 'ready'; data: T }

/**
 * Returns a `Resource<T>` built from `build()`, after `latencyMs` of simulated
 * latency. Reloads whenever `key` changes.
 *
 * `loading` is derived from "the settled result's key/nonce differs from the
 * current one" instead of a synchronous `setState` call when `key` changes,
 * so the effect stays clean under the React 19 `react-hooks` lint rules.
 */
export function useDemoResource<T>(key: string, build: () => T, options?: UseDemoResourceOptions): Resource<T> {
  const { latencyMs = 400, forceLoading = false, forceError = false } = options ?? {}

  // Held in a ref so the effect below does not need `build` in its deps and always calls the
  // latest closure. Updated in its own effect (not during render) to satisfy react-hooks/refs.
  const buildRef = useRef(build)
  useEffect(() => {
    buildRef.current = build
  })

  const [retryNonce, setRetryNonce] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)

  useEffect(() => {
    if (forceLoading) {
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled) {
        return
      }
      if (forceError) {
        setSettled({ key, nonce: retryNonce, status: 'error' })
        return
      }
      setSettled({ key, nonce: retryNonce, status: 'ready', data: buildRef.current() })
    }, latencyMs)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key, retryNonce, latencyMs, forceLoading, forceError])

  const retry = () => setRetryNonce((n) => n + 1)

  const update = (fn: (current: T) => T) => {
    setSettled((current) =>
      current && current.status === 'ready' && current.key === key ? { ...current, data: fn(current.data) } : current,
    )
  }

  const isStale = forceLoading || !settled || settled.key !== key || settled.nonce !== retryNonce
  if (isStale) {
    return { status: 'loading' }
  }
  if (settled.status === 'error') {
    return { status: 'error', retry }
  }
  return { status: 'ready', data: settled.data, retry, update }
}
