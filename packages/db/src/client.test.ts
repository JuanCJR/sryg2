import { describe, expect, it } from 'vitest'
import { resolvePoolConfig } from './client'

describe('resolvePoolConfig', () => {
  it('leaves local URLs without TLS', () => {
    const config = resolvePoolConfig('postgres://sryg:sryg@localhost:5432/sryg')
    expect(config.ssl).toBeUndefined()
    expect(config.connectionString).toBe('postgres://sryg:sryg@localhost:5432/sryg')
  })

  it('enables verified TLS for sslmode=require and strips the param', () => {
    const config = resolvePoolConfig('postgres://u:p@ep-x.neon.tech/db?sslmode=require&application_name=sryg')
    expect(config.ssl).toEqual({ rejectUnauthorized: true })
    expect(config.connectionString).not.toContain('sslmode')
    expect(config.connectionString).toContain('application_name=sryg')
  })
})
