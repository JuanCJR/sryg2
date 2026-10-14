import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from './test/create-test-app'

describe('configureApp CORS', () => {
  let app: INestApplication
  beforeAll(async () => {
    app = await createTestApp({ CORS_ORIGIN: 'http://allowed.test,http://other.test' })
  })
  afterAll(() => app.close())

  it('allows each configured exact origin', async () => {
    for (const origin of ['http://allowed.test', 'http://other.test']) {
      const res = await request(app.getHttpServer()).get('/health').set('Origin', origin).expect(200)
      expect(res.headers['access-control-allow-origin']).toBe(origin)
    }
  })

  it('exposes Retry-After so the browser can read the login throttle window', async () => {
    const res = await request(app.getHttpServer()).get('/health').set('Origin', 'http://allowed.test').expect(200)
    expect(res.headers['access-control-expose-headers']).toContain('Retry-After')
  })

  it('does not allow other origins, including look-alikes', async () => {
    for (const origin of ['http://evil.test', 'http://allowed.test.evil.test', 'https://allowed.test']) {
      const res = await request(app.getHttpServer()).get('/health').set('Origin', origin)
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    }
  })

  it('answers preflight for an allowed origin only', async () => {
    const ok = await request(app.getHttpServer())
      .options('/health')
      .set('Origin', 'http://allowed.test')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Authorization')
    expect(ok.status).toBe(204)
    expect(ok.headers['access-control-allow-headers']).toContain('Authorization')
    const denied = await request(app.getHttpServer())
      .options('/health')
      .set('Origin', 'http://evil.test')
      .set('Access-Control-Request-Method', 'POST')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('app boot', () => {
  it('fails fast listing every invalid variable', async () => {
    const error = await createTestApp({ JWT_SECRET: 'short', PORT: 'abc' }).catch((e: Error) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toMatch(/JWT_SECRET[\s\S]*PORT|PORT[\s\S]*JWT_SECRET/)
  })
})
