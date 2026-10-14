import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'

describe('health (database up)', () => {
  let app: INestApplication
  beforeAll(async () => {
    app = await createTestApp()
  })
  afterAll(() => app.close())

  it('GET /health is 200 outside the api prefix', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('GET /health/ready is 200 when the database answers', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200)
    expect(res.body).toEqual({ status: 'ok', db: 'up' })
  })

  it('does not expose health under the api prefix', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(404)
  })
})

describe('health (database down)', () => {
  let app: INestApplication
  beforeAll(async () => {
    app = await createTestApp({ DATABASE_URL: 'postgres://sryg:sryg@127.0.0.1:1/sryg' })
  })
  afterAll(() => app.close())

  it('GET /health stays 200 without touching the database', async () => {
    await request(app.getHttpServer()).get('/health').expect(200)
  })

  it('GET /health/ready is 503', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(503)
    expect(res.body).toMatchObject({ status: 'error', db: 'down' })
  })
})
