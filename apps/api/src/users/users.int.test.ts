import type { INestApplication } from '@nestjs/common'
import { auditoria, createDb, usuario } from '@sryg/db'
import { and, desc, eq, inArray, ne } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
const RUN = randomUUID().slice(0, 8)

describe('user administration (AUTH-06, D1, D4, D14, D24)', () => {
  let app: INestApplication
  let users: Record<'admin' | 'supervisor' | 'consulta', TestUser>
  const createdEmails: string[] = []
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const login = (email: string, password: string) => http().post('/api/auth/login').send({ email, password })
  const newUser = (key: string, extra: object = {}) => {
    const email = `alta-${key}-${RUN}@sryg.test`
    createdEmails.push(email)
    return { email, fullName: `Usuario ${key}`, role: 'consulta', area: 'licencias', ...extra }
  }
  const create = async (key: string, extra: object = {}) => {
    const res = await http().post('/api/users').set(as(users.admin)).send(newUser(key, extra)).expect(201)
    return res.body as { user: { id: string; email: string }; temporaryPassword: string }
  }
  // Logins also audit (autenticar) against the user: only the administration rows matter here.
  const lastAudit = async (entityId: string) => {
    const [row] = await db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entityId, entityId), ne(auditoria.action, 'autenticar')))
      .orderBy(desc(auditoria.id))
      .limit(1)
    return row
  }

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      admin: { role: 'administrador', area: 'ambas' },
      supervisor: { role: 'supervisor', area: 'ambas' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
  })
  afterAll(async () => {
    await app.close()
    await deleteTestUsers(db, users)
    await db
      .delete(usuario)
      .where(inArray(usuario.email, createdEmails))
      .catch(() => undefined)
    await pool.end()
  })

  it('is Admin only: Supervisor and Consulta get 403, anonymous 401', async () => {
    for (const user of [users.supervisor, users.consulta]) {
      await http().get('/api/users').set(as(user)).expect(403)
      await http().post('/api/users').set(as(user)).send(newUser('denegado')).expect(403)
      await http().patch(`/api/users/${users.admin.id}`).set(as(user)).send({ fullName: 'X' }).expect(403)
      await http().post(`/api/users/${users.admin.id}/reset-password`).set(as(user)).expect(403)
      await http().post(`/api/users/${users.admin.id}/deactivate`).set(as(user)).expect(403)
    }
    await http().get('/api/users').expect(401)
  })

  it('lists users paginated and searchable by name or email, without password data', async () => {
    const res = await http().get('/api/users').query({ q: users.supervisor.email, pageSize: 5 }).set(as(users.admin))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ page: 1, pageSize: 5, total: 1 })
    expect(res.body.items[0]).toMatchObject({
      id: users.supervisor.id,
      email: users.supervisor.email,
      role: 'supervisor',
      area: 'ambas',
      isActive: true,
      mustChangePassword: false,
    })
    expect(JSON.stringify(res.body)).not.toMatch(/password_?hash|argon2/i)
  })

  it('creates a user with a temporary password shown once, forcing a change on first login, and audits it', async () => {
    const { user, temporaryPassword } = await create('crear', { role: 'supervisor', area: 'medicina' })
    expect(user).toMatchObject({ role: 'supervisor', area: 'medicina', isActive: true, mustChangePassword: true })
    expect(temporaryPassword.length).toBeGreaterThanOrEqual(10)

    const { body } = await login(user.email, temporaryPassword).expect(200)
    expect(body.user.mustChangePassword).toBe(true)

    const audit = await lastAudit(user.id)
    expect(audit).toMatchObject({ action: 'crear', entity: 'usuario', actorId: users.admin.id })
    expect(JSON.stringify(audit?.changes)).not.toContain(temporaryPassword)
    expect(JSON.stringify(audit?.changes)).not.toMatch(/argon2/)
  })

  it('answers 409 for an email already in use, in any casing', async () => {
    const { user } = await create('duplicado')
    await http()
      .post('/api/users')
      .set(as(users.admin))
      .send({ email: user.email.toUpperCase(), fullName: 'Otro', role: 'consulta', area: 'ambas' })
      .expect(409)
  })

  it('validates the body with 400', async () => {
    await http().post('/api/users').set(as(users.admin)).send({ email: 'x', fullName: '', role: 'root' }).expect(400)
    await http().patch(`/api/users/${users.consulta.id}`).set(as(users.admin)).send({}).expect(400)
    await http().patch('/api/users/no-es-uuid').set(as(users.admin)).send({ fullName: 'X' }).expect(400)
  })

  it('edits name, role and area, auditing only what changed', async () => {
    const { user } = await create('editar')
    const res = await http()
      .patch(`/api/users/${user.id}`)
      .set(as(users.admin))
      .send({ fullName: 'Nombre Editado', role: 'supervisor', area: 'licencias' })
      .expect(200)
    expect(res.body).toMatchObject({ fullName: 'Nombre Editado', role: 'supervisor', area: 'licencias' })
    expect((await lastAudit(user.id))?.changes).toEqual({
      before: { fullName: 'Usuario editar', role: 'consulta' },
      after: { fullName: 'Nombre Editado', role: 'supervisor' },
    })
    await http().patch(`/api/users/${randomUUID()}`).set(as(users.admin)).send({ fullName: 'Nadie' }).expect(404)
  })

  it('deactivates and activates a user; a deactivated user cannot log in', async () => {
    const { user, temporaryPassword } = await create('activar')
    const off = await http().post(`/api/users/${user.id}/deactivate`).set(as(users.admin)).expect(200)
    expect(off.body.isActive).toBe(false)
    await login(user.email, temporaryPassword).expect(401)
    expect(await lastAudit(user.id)).toMatchObject({
      action: 'actualizar',
      changes: { before: { isActive: true }, after: { isActive: false } },
    })

    const on = await http().post(`/api/users/${user.id}/activate`).set(as(users.admin)).expect(200)
    expect(on.body.isActive).toBe(true)
    await login(user.email, temporaryPassword).expect(200)
  })

  it('resets the password: the old one stops working, the temporary one forces a change, and it is audited', async () => {
    const { user, temporaryPassword: first } = await create('reset')
    const res = await http().post(`/api/users/${user.id}/reset-password`).set(as(users.admin)).expect(200)
    const { temporaryPassword } = res.body as { temporaryPassword: string }
    expect(temporaryPassword).not.toBe(first)
    expect(res.body.user.mustChangePassword).toBe(true)

    await login(user.email, first).expect(401)
    const { body } = await login(user.email, temporaryPassword).expect(200)
    expect(body.user.mustChangePassword).toBe(true)

    const audit = await lastAudit(user.id)
    expect(audit).toMatchObject({ action: 'restablecer_contrasena', entity: 'usuario', actorId: users.admin.id })
    expect(JSON.stringify(audit?.changes)).not.toContain(temporaryPassword)
    await http().post(`/api/users/${randomUUID()}/reset-password`).set(as(users.admin)).expect(404)
  })

  describe('the last active Admin', () => {
    let parked: string[] = []

    // Leaves users.admin as the only active Admin (other suites leave Admins behind), then restores them.
    beforeAll(async () => {
      const others = await db
        .update(usuario)
        .set({ isActive: false })
        .where(and(eq(usuario.role, 'administrador'), eq(usuario.isActive, true), ne(usuario.id, users.admin.id)))
        .returning({ id: usuario.id })
      parked = others.map((o) => o.id)
    })
    afterAll(async () => {
      if (parked.length) await db.update(usuario).set({ isActive: true }).where(inArray(usuario.id, parked))
    })

    it('cannot be deactivated nor demoted (409), and nothing is written', async () => {
      await http().post(`/api/users/${users.admin.id}/deactivate`).set(as(users.admin)).expect(409)
      await http().patch(`/api/users/${users.admin.id}`).set(as(users.admin)).send({ role: 'supervisor' }).expect(409)
      const [row] = await db.select().from(usuario).where(eq(usuario.id, users.admin.id))
      expect(row).toMatchObject({ role: 'administrador', isActive: true })
      // Name and area are still editable.
      await http().patch(`/api/users/${users.admin.id}`).set(as(users.admin)).send({ area: 'licencias' }).expect(200)
    })

    it('can be deactivated or demoted once another Admin is active', async () => {
      const { user } = await create('segundo-admin', { role: 'administrador', area: 'ambas' })
      await http().patch(`/api/users/${user.id}`).set(as(users.admin)).send({ role: 'consulta' }).expect(200)
      await http().patch(`/api/users/${user.id}`).set(as(users.admin)).send({ role: 'administrador' }).expect(200)
      await http().post(`/api/users/${user.id}/deactivate`).set(as(users.admin)).expect(200)
      // With the second one deactivated, users.admin is the last one again.
      await http().post(`/api/users/${users.admin.id}/deactivate`).set(as(users.admin)).expect(409)
    })
  })
})
