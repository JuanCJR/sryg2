import { useSyncExternalStore } from 'react'
import { sessionStore } from '../domain/session'

/** Reactive view of the stored access token: components re-render on sign-in and sign-out. */
export function useSession(): { token: string | null; isAuthenticated: boolean } {
  const token = useSyncExternalStore(sessionStore.subscribe, sessionStore.get, () => null)
  return { token, isAuthenticated: token !== null }
}
