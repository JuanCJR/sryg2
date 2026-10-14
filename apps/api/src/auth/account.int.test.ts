import type { INestApplication } from '@nestjs/common'
import { accesoUsuario, auditoria, createDb, usuario } from '@sryg/db'
import { and, desc, eq } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, TEST_PASSWORD, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)

describe('own account (AUTH-08, D4, D23)', () => {
  let app: INestApplication
  let users: Record<'owner' | 'other', TestUser>
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const login = (email: string, password: string) => http().post('/api/auth/login').send({ email, password })

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      owner: { role: 'consulta', area: 'licencias' },
      other: { role: 'supervisor', area: 'medicina' },
    })
  })
  afterAll(async () => {
    await app.close()
    await deleteTestUsers(db, users)
    await pool.end()
  })

  describe('POST /api/auth/change-password', () => {
    const change = (user: TestUser, body: object) => http().post('/api/auth/change-password').set(as(user)).send(body)

    it('requires authentication', async () => {
      await http()
        .post('/api/auth/change-password')
        .send({ currentPassword: 'x', newPassword: 'y'.repeat(10) })
        .expect(401)
    })

    it('rejects a new password shorter than 10 characters with 400', async () => {
      await change(users.other, { currentPassword: TEST_PASSWORD, newPassword: 'corta-123' }).expect(400)
    })

    it('rejects a wrong current password with 403 (not 401: the session stays valid) and changes nothing', async () => {
      const res = await change(users.other, { currentPassword: 'no-es-la-actual', newPassword: 'nueva-clave-segura' })
      expect(res.status).toBe(403)
      await login(users.other.email, TEST_PASSWORD).expect(200)
    })

    it('changes the password, clears mustChangePassword and audits it without secrets', async () => {
      await db.update(usuario).set({ mustChangePassword: true }).where(eq(usuario.id, users.owner.id))
      const newPassword = 'una frase nueva y larga'
      await change(users.owner, { currentPassword: TEST_PASSWORD, newPassword }).expect(204)

      await login(users.owner.email, TEST_PASSWORD).expect(401)
      const { body } = await login(users.owner.email, newPassword).expect(200)
      expect(body.user.mustChangePassword).toBe(false)

      const [row] = await db
        .select()
        .from(auditoria)
        .where(and(eq(auditoria.entityId, users.owner.id), eq(auditoria.action, 'actualizar')))
        .orderBy(desc(auditoria.id))
        .limit(1)
      expect(row).toMatchObject({ actorId: users.owner.id, entity: 'usuario' })
      expect(row?.changes).toEqual({
        before: { mustChangePassword: true },
        after: { mustChangePassword: false, passwordChanged: true },
      })
      expect(JSON.stringify(row?.changes)).not.toContain(newPassword)
    })
  })

  describe('GET /api/auth/me/access-log', () => {
    it('requires authentication', async () => {
      await http().get('/api/auth/me/access-log').expect(401)
    })

    it('returns the last 5 successful and the last 5 failed accesses of the current user, newest first', async () => {
      const { email, id } = users.other
      await db.delete(accesoUsuario).where(eq(accesoUsuario.usuarioId, id))
      for (let i = 1; i <= 6; i++) {
        await login(email, `mala-${i}`).set('X-Forwarded-For', `198.51.100.${i}`).expect(401)
      }
      let token = ''
      for (let i = 1; i <= 6; i++) {
        const res = await login(email, TEST_PASSWORD).set('X-Forwarded-For', `203.0.113.${i}`).expect(200)
        token = res.body.accessToken
      }
      // Someone else's attempts never show up.
      await login(users.owner.email, 'mala').set('X-Forwarded-For', '192.0.2.99').expect(401)

      const { body } = await http().get('/api/auth/me/access-log').set('Authorization', `Bearer ${token}`).expect(200)
      expect(body.successful.map((e: { ip: string }) => e.ip)).toEqual([
        '203.0.113.6',
        '203.0.113.5',
        '203.0.113.4',
        '203.0.113.3',
        '203.0.113.2',
      ])
      expect(body.failed.map((e: { ip: string }) => e.ip)).toEqual([
        '198.51.100.6',
        '198.51.100.5',
        '198.51.100.4',
        '198.51.100.3',
        '198.51.100.2',
      ])
      expect(Object.keys(body.successful[0]).sort()).toEqual(['at', 'ip'])
      expect(new Date(body.successful[0].at).getTime()).not.toBeNaN()
    })
  })
})
