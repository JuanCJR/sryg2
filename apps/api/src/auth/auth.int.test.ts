import type { INestApplication } from '@nestjs/common'
import { accesoUsuario, auditoria, createDb, usuario } from '@sryg/db'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { Argon2PasswordHasher } from './services/argon2-password-hasher'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const PASSWORD = 'correct horse battery staple'
// Unique per run: users that already have audit rows (append-only, FK RESTRICT) cannot be deleted.
const RUN = randomUUID().slice(0, 8)
const EMAILS = { active: `auth-active-${RUN}@sryg.test`, inactive: `auth-inactive-${RUN}@sryg.test` }

const { db, pool } = createDb(DATABASE_URL)

async function seedUsers() {
  const passwordHash = await new Argon2PasswordHasher().hash(PASSWORD)
  await db.delete(usuario).where(inArray(usuario.email, Object.values(EMAILS)))
  await db.insert(usuario).values([
    {
      email: EMAILS.active,
      fullName: 'Active User',
      role: 'supervisor',
      area: 'medicina',
      passwordHash,
      isActive: true,
    },
    {
      email: EMAILS.inactive,
      fullName: 'Inactive User',
      role: 'consulta',
      area: 'ambas',
      passwordHash,
      isActive: false,
    },
  ])
}

describe('auth http', () => {
  let app: INestApplication
  const http = () => request(app.getHttpServer())
  const login = (email: string, password: string) => http().post('/api/auth/login').send({ email, password })

  beforeAll(async () => {
    await seedUsers()
    app = await createTestApp()
  })
  afterAll(async () => {
    await app.close()
    // Best effort: rows that gained audit rows stay behind (append-only trail).
    await db
      .delete(usuario)
      .where(inArray(usuario.email, Object.values(EMAILS)))
      .catch(() => undefined)
    await pool.end()
  })

  it('logs in with valid credentials and returns a token carrying the role claim', async () => {
    const res = await login(EMAILS.active, PASSWORD).expect(200)
    expect(res.body).toMatchObject({
      expiresIn: 3600,
      user: { email: EMAILS.active, role: 'supervisor', area: 'medicina', mustChangePassword: false },
    })
    expect(JSON.stringify(res.body)).not.toMatch(/argon2|"password/i)
    const claims = new JwtService().decode<{ sub: string; role: string }>(res.body.accessToken)
    expect(claims).toMatchObject({ sub: res.body.user.id, role: 'supervisor', area: 'medicina' })
  })

  it('returns an identical 401 for wrong password, unknown email and inactive user', async () => {
    const wrong = await login(EMAILS.active, 'wrong-password').expect(401)
    const unknown = await login('ghost@sryg.test', PASSWORD).expect(401)
    const inactive = await login(EMAILS.inactive, PASSWORD).expect(401)
    expect(unknown.body).toEqual(wrong.body)
    expect(inactive.body).toEqual(wrong.body)
    expect(wrong.body).toMatchObject({ statusCode: 401, error: 'Unauthorized' })
  })

  it('writes an autenticar audit row for a successful login and an anonymous one for a failure', async () => {
    const { body } = await login(EMAILS.active, PASSWORD).expect(200)
    const userId: string = body.user.id
    const success = () =>
      db
        .select()
        .from(auditoria)
        .where(and(eq(auditoria.action, 'autenticar'), eq(auditoria.actorId, userId)))
    const failure = () =>
      db
        .select()
        .from(auditoria)
        .where(and(eq(auditoria.action, 'autenticar'), isNull(auditoria.actorId)))
    const [okBefore, failBefore] = [(await success()).length, (await failure()).length]
    await login(EMAILS.active, PASSWORD).expect(200)
    await login(EMAILS.active, 'wrong-password').expect(401)
    expect((await success()).length).toBe(okBefore + 1)
    expect((await failure()).length).toBeGreaterThanOrEqual(failBefore + 1)
  })

  it('records each attempt in acceso_usuario with the client IP (D23)', async () => {
    const { body } = await login(EMAILS.active, PASSWORD).set('X-Forwarded-For', '198.51.100.20').expect(200)
    await login(EMAILS.active, 'wrong-password').set('X-Forwarded-For', '198.51.100.21').expect(401)
    const rows = await db
      .select()
      .from(accesoUsuario)
      .where(eq(accesoUsuario.usuarioId, body.user.id))
      .orderBy(desc(accesoUsuario.id))
      .limit(2)
    expect(rows.map((r) => [r.identifier, r.ip, r.success])).toEqual([
      [EMAILS.active, '198.51.100.21', false],
      [EMAILS.active, '198.51.100.20', true],
    ])
  })

  it('returns 400 for missing or malformed login fields', async () => {
    await http().post('/api/auth/login').send({ email: EMAILS.active }).expect(400)
    await http().post('/api/auth/login').send({ email: 'not-an-email', password: 'x' }).expect(400)
    await http().post('/api/auth/login').send({}).expect(400)
  })

  it('GET /api/auth/me returns the user for a valid token', async () => {
    const { body } = await login(EMAILS.active, PASSWORD).expect(200)
    const res = await http().get('/api/auth/me').set('Authorization', `Bearer ${body.accessToken}`).expect(200)
    expect(res.body).toEqual(body.user)
  })

  it('rejects missing, malformed, tampered and expired tokens with 401', async () => {
    const { body } = await login(EMAILS.active, PASSWORD).expect(200)
    const jwt = new JwtService({ secret: process.env.JWT_SECRET })
    const expired = await jwt.signAsync(
      { sub: body.user.id, email: EMAILS.active, role: 'supervisor' },
      { expiresIn: -10 },
    )
    const forged = await new JwtService({ secret: 'another-secret-that-is-long-enough-123' }).signAsync({
      sub: body.user.id,
      email: EMAILS.active,
      role: 'administrador',
    })
    await http().get('/api/auth/me').expect(401)
    await http().get('/api/auth/me').set('Authorization', 'Basic abc').expect(401)
    await http().get('/api/auth/me').set('Authorization', 'Bearer not.a.jwt').expect(401)
    await http().get('/api/auth/me').set('Authorization', `Bearer ${body.accessToken}x`).expect(401)
    await http().get('/api/auth/me').set('Authorization', `Bearer ${expired}`).expect(401)
    await http().get('/api/auth/me').set('Authorization', `Bearer ${forged}`).expect(401)
  })

  it('rejects a valid token whose user was since deactivated', async () => {
    const token = await new JwtService({ secret: process.env.JWT_SECRET }).signAsync({
      sub: '00000000-0000-4000-8000-000000000000',
      email: 'gone@sryg.test',
      role: 'consulta',
    })
    await http().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(401)
  })

  it('keeps health public', async () => {
    await http().get('/health').expect(200)
    await http().get('/health/ready').expect(200)
  })
})

describe('login throttling', () => {
  let app: INestApplication
  beforeAll(async () => {
    app = await createTestApp({ LOGIN_THROTTLE_LIMIT: '2', LOGIN_THROTTLE_TTL: '60' })
  })
  afterAll(() => app.close())

  it('returns 429 after the limit on login only', async () => {
    const attempt = () =>
      request(app.getHttpServer()).post('/api/auth/login').send({ email: 'a@sryg.test', password: 'x' })
    await attempt().expect(401)
    await attempt().expect(401)
    await attempt().expect(429)
    await request(app.getHttpServer()).get('/health').expect(200)
  })
})
