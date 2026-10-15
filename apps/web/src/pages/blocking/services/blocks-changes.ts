import { useSyncExternalStore } from 'react'

/**
 * Every view of blocks (the banner, the Expediente page key and /bloqueos) refetches when a block is
 * registered or resolved anywhere, so the persistent banner never outlives the block it reports.
 */
let version = 0
const listeners = new Set<() => void>()

export function notifyBlocksChanged() {
  version += 1
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useBlocksVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => version,
  )
}
