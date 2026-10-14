import { describe, expect, it, vi } from 'vitest'
import { SESSION_KEY, createSessionStore } from './session'

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

describe('createSessionStore', () => {
  it('starts empty and reads a token already in storage', () => {
    expect(createSessionStore(fakeStorage()).get()).toBeNull()
    expect(createSessionStore(fakeStorage({ [SESSION_KEY]: 'abc' })).get()).toBe('abc')
  })

  it('persists a token on set and removes it on clear', () => {
    const storage = fakeStorage()
    const store = createSessionStore(storage)
    store.set('tok')
    expect(storage.getItem(SESSION_KEY)).toBe('tok')
    expect(store.get()).toBe('tok')
    store.clear()
    expect(storage.getItem(SESSION_KEY)).toBeNull()
    expect(store.get()).toBeNull()
  })

  it('notifies subscribers on set and clear, and stops after unsubscribe', () => {
    const store = createSessionStore(fakeStorage())
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.set('t')
    store.clear()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    store.set('u')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('tells an explicit sign-out apart from an expired session until the next sign-in', () => {
    const store = createSessionStore(fakeStorage())
    store.set('t')
    store.clear()
    expect(store.signedOut()).toBe(false)
    store.set('t')
    store.signOut()
    expect(store.get()).toBeNull()
    expect(store.signedOut()).toBe(true)
    store.set('u')
    expect(store.signedOut()).toBe(false)
  })

  it('falls back to memory when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    const store = createSessionStore(broken)
    expect(store.get()).toBeNull()
    store.set('mem')
    expect(store.get()).toBe('mem')
    store.clear()
    expect(store.get()).toBeNull()
  })

  it('works without any storage', () => {
    const store = createSessionStore(undefined)
    store.set('x')
    expect(store.get()).toBe('x')
  })
})
