export const SESSION_KEY = 'sryg.session.token'

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface SessionStore {
  get(): string | null
  set(token: string): void
  /** Drops the token because it expired or was rejected (the user is sent back to where they were). */
  clear(): void
  /** Drops the token because the user signed out (no page to come back to). */
  signOut(): void
  /** Whether the session ended by `signOut` (until the next `set`). */
  signedOut(): boolean
  /** Subscribe to changes (useSyncExternalStore-compatible); returns the unsubscribe function. */
  subscribe(listener: () => void): () => void
}

/**
 * Access-token holder backed by sessionStorage (never localStorage: the session must die with the tab).
 * Falls back to memory when storage is missing or throws (blocked cookies, private mode).
 */
export function createSessionStore(storage: TokenStorage | undefined): SessionStore {
  const listeners = new Set<() => void>()
  let memory: string | null = null
  let useMemory = false
  let endedBySignOut = false

  const read = (): string | null => {
    if (useMemory || !storage) return memory
    try {
      return storage.getItem(SESSION_KEY)
    } catch {
      useMemory = true
      return memory
    }
  }

  const write = (token: string | null) => {
    memory = token
    if (!useMemory && storage) {
      try {
        if (token === null) storage.removeItem(SESSION_KEY)
        else storage.setItem(SESSION_KEY, token)
      } catch {
        useMemory = true
      }
    }
    listeners.forEach((listener) => listener())
  }

  return {
    get: read,
    set: (token) => {
      endedBySignOut = false
      write(token)
    },
    clear: () => write(null),
    signOut: () => {
      endedBySignOut = true
      write(null)
    },
    signedOut: () => endedBySignOut,
    subscribe(listener) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
  }
}

function browserSessionStorage(): TokenStorage | undefined {
  try {
    return globalThis.sessionStorage
  } catch {
    return undefined
  }
}

export const sessionStore = createSessionStore(browserSessionStorage())
