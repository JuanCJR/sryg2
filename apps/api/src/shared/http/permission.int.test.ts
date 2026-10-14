import { randomInt } from 'node:crypto'
import { Controller, type INestApplication, Get, HttpCode, Post } from '@nestjs/common'
import { createDb, personalAeronautico } from '@sryg/db'
import { inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../../test/test-users'
import { RequirePermission } from './require-permission.decorator'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)

// Stand-in for the medical-certificates write endpoints (W1-6), which are out of scope here.
@Controller('test-rbac')
class ProbeController {
  @Post('medical-certificates')
  @HttpCode(204)
  @RequirePermission('medical_certificates', 'write')
  writeCertificate() {}

  @Get('open')
  open() {
    return { ok: true }
  }
}

describe('permission guard (AUTH-04, D1, D24)', () => {
  let app: INestApplication
  let users: Record<'consulta' | 'supLicencias' | 'supMedicina' | 'admin', TestUser>
  const cedulas: string[] = []
  const http = () => request(app.getHttpServer())
  const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const newPerson = () => {
    const cedula = String(randomInt(10_000_000, 99_999_999))
    cedulas.push(cedula)
    return { cedula, firstNames: 'Prueba', lastNames: 'Permisos' }
  }

  beforeAll(async () => {
    app = await createTestApp({}, [ProbeController])
    users = await createTestUsers(db, app, {
      consulta: { role: 'consulta', area: 'ambas' },
      supLicencias: { role: 'supervisor', area: 'licencias' },
      supMedicina: { role: 'supervisor', area: 'medicina' },
      admin: { role: 'administrador', area: 'licencias' },
    })
  })
  afterAll(async () => {
    await app.close()
    if (cedulas.length) await db.delete(personalAeronautico).where(inArray(personalAeronautico.cedula, cedulas))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('answers 403 when Consulta writes personnel, and still lets it read', async () => {
    const res = await http().post('/api/personnel').set(as(users.consulta)).send(newPerson()).expect(403)
    expect(res.body).toEqual({ statusCode: 403, error: 'Forbidden', message: 'Forbidden' })
    await http().get('/api/personnel').set(as(users.consulta)).expect(200)
  })

  it('answers 403 when a Licencias Supervisor writes a medical certificate', async () => {
    await http().post('/api/test-rbac/medical-certificates').set(as(users.supLicencias)).expect(403)
    await http().post('/api/test-rbac/medical-certificates').set(as(users.supMedicina)).expect(204)
    await http().post('/api/test-rbac/medical-certificates').set(as(users.admin)).expect(204)
  })

  it('lets Supervisors of any area write personnel (D24)', async () => {
    await http().post('/api/personnel').set(as(users.supMedicina)).send(newPerson()).expect(201)
    await http().post('/api/personnel').set(as(users.supLicencias)).send(newPerson()).expect(201)
  })

  it('leaves routes without @RequirePermission to the authentication guard', async () => {
    await http().get('/api/test-rbac/open').expect(401)
    await http().get('/api/test-rbac/open').set(as(users.consulta)).expect(200)
  })
})
