import { describe, expect, it } from 'vitest'
import { DEV_API_URL, resolveApiUrl } from './config'

describe('resolveApiUrl', () => {
  it('uses VITE_API_URL and strips trailing slashes', () => {
    expect(resolveApiUrl({ VITE_API_URL: 'https://api.example.com//', DEV: false })).toBe('https://api.example.com')
  })

  it('falls back to the local default in dev', () => {
    expect(resolveApiUrl({ DEV: true })).toBe(DEV_API_URL)
  })

  it('returns undefined in production when unset (does not throw)', () => {
    expect(resolveApiUrl({ DEV: false })).toBeUndefined()
    expect(resolveApiUrl({ VITE_API_URL: '  ', DEV: false })).toBeUndefined()
  })
})
