import { describe, expect, it } from 'vitest'
import { validateEnv } from './env.schema'

const valid = {
  DATABASE_URL: 'postgres://sryg:sryg@localhost:5432/sryg',
  JWT_SECRET: 'x'.repeat(32),
  CORS_ORIGIN: 'http://localhost:5173',
}

describe('validateEnv', () => {
  it('applies defaults and parses CORS origins', () => {
    const env = validateEnv({ ...valid, CORS_ORIGIN: 'http://a.test, https://b.test' })
    expect(env.PORT).toBe(3000)
    expect(env.JWT_TTL_SECONDS).toBe(3600)
    expect(env.LOGIN_THROTTLE_LIMIT).toBe(5)
    expect(env.LOGIN_THROTTLE_TTL).toBe(60)
    expect(env.CORS_ORIGINS).toEqual(['http://a.test', 'https://b.test'])
  })

  it('lists every invalid or missing variable in one error', () => {
    const run = () => validateEnv({ JWT_SECRET: 'short', PORT: 'abc' })
    expect(run).toThrow(/DATABASE_URL/)
    expect(run).toThrow(/JWT_SECRET/)
    expect(run).toThrow(/CORS_ORIGIN/)
    expect(run).toThrow(/PORT/)
  })

  it('counts JWT_SECRET length in bytes, not characters', () => {
    // 16 two-byte characters = 32 bytes: valid; 31 ASCII chars = 31 bytes: invalid.
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'é'.repeat(16) })).not.toThrow()
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'x'.repeat(31) })).toThrow(/JWT_SECRET/)
  })

  it('rejects non-postgres DATABASE_URL and non-origin CORS entries', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL/)
    expect(() => validateEnv({ ...valid, CORS_ORIGIN: 'http://a.test/path' })).toThrow(/CORS_ORIGIN/)
  })

  it('accepts a trailing slash or surrounding quotes pasted from a dashboard and normalizes them', () => {
    const env = validateEnv({ ...valid, CORS_ORIGIN: '"https://a.test/", https://b.test/' })
    expect(env.CORS_ORIGINS).toEqual(['https://a.test', 'https://b.test'])
  })

  it('names the expected format when CORS_ORIGIN is invalid', () => {
    expect(() => validateEnv({ ...valid, CORS_ORIGIN: 'a.test' })).toThrow(/https:\/\/host/)
  })

  it('requires https origins in production', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN/)
    expect(() => validateEnv({ ...valid, NODE_ENV: 'production', CORS_ORIGIN: 'https://a.test' })).not.toThrow()
  })
})
