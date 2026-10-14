import { randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { auditoria, catalogAttachmentType, createDb, personalAdjunto, personalAeronautico } from '@sryg/db'
import { ATTACHMENT_MAX_BYTES } from '@sryg/types'
import { and, eq, inArray } from 'drizzle-orm'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
const RUN = `zz${randomUUID().slice(0, 8)}`
const CEDULA = String(randomInt(10_000_000, 99_999_999))
// Fictitious file contents: only the leading signature matters to the server.
const PDF = Buffer.from('%PDF-1.4\n% documento ficticio\n%%EOF\n')
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')

const binary = (req: request.Test) =>
  req.buffer(true).parse((res, done) => {
    const chunks: Buffer[] = []
    res.on('data', (chunk: Buffer) => chunks.push(chunk))
    res.on('end', () => done(null, Buffer.concat(chunks)))
  })

describe('/api/personnel/:id/attachments (D21)', () => {
  let app: INestApplication
  let users: Record<'supervisor' | 'consulta', TestUser>
  let personId: string
  let typeId: string
  let inactiveTypeId: string
  const http = () => request(app.getHttpServer())
  const bearer = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const base = () => `/api/personnel/${personId}/attachments`
  const upload = (file: Buffer, filename: string, contentType: string, attachmentTypeId: string = typeId) =>
    http()
      .post(base())
      .set(bearer(users.supervisor))
      .field('attachmentTypeId', attachmentTypeId)
      .attach('file', file, { filename, contentType })
  const audits = (action: 'adjuntar' | 'eliminar') =>
    db
      .select()
      .from(auditoria)
      .where(
        and(
          eq(auditoria.entity, 'personal_adjunto'),
          eq(auditoria.action, action),
          eq(auditoria.actorId, users.supervisor.id),
        ),
      )

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      supervisor: { role: 'supervisor', area: 'licencias' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
    const [type, inactive] = await db
      .insert(catalogAttachmentType)
      .values([{ nameEs: `${RUN} Cédula de identidad` }, { nameEs: `${RUN} Obsoleto`, active: false }])
      .returning({ id: catalogAttachmentType.id })
    typeId = type!.id
    inactiveTypeId = inactive!.id
    const res = await http()
      .post('/api/personnel')
      .set(bearer(users.supervisor))
      .send({ cedula: CEDULA, firstNames: 'Persona', lastNames: `${RUN} Adjuntos` })
      .expect(201)
    personId = res.body.id
  })
  afterAll(async () => {
    await app.close()
    await db.delete(personalAeronautico).where(eq(personalAeronautico.cedula, CEDULA))
    await db.delete(catalogAttachmentType).where(inArray(catalogAttachmentType.id, [typeId, inactiveTypeId]))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('starts empty', async () => {
    expect((await http().get(base()).set(bearer(users.consulta)).expect(200)).body).toEqual([])
  })

  it('uploads a PDF, lists it with its catalog type, downloads the same bytes and audits it as adjuntar', async () => {
    const created = await upload(PDF, 'cédula escaneada.pdf', 'application/pdf').expect(201)
    expect(created.body).toEqual({
      id: expect.any(String),
      personalId: personId,
      attachmentTypeId: typeId,
      attachmentTypeName: `${RUN} Cédula de identidad`,
      filename: 'cédula escaneada.pdf',
      mime: 'application/pdf',
      size: PDF.length,
      createdAt: expect.any(String),
    })
    expect(created.body).not.toHaveProperty('data')

    const list = await http().get(base()).set(bearer(users.consulta)).expect(200)
    expect(list.body).toEqual([created.body])

    const file = await binary(http().get(`${base()}/${created.body.id}`).set(bearer(users.consulta))).expect(200)
    expect(file.headers['content-type']).toBe('application/pdf')
    expect(file.headers['content-disposition']).toContain("filename*=UTF-8''c%C3%A9dula%20escaneada.pdf")
    expect(Buffer.compare(file.body as Buffer, PDF)).toBe(0)

    const rows = (await audits('adjuntar')).filter((row) => row.entityId === created.body.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.changes).toEqual({
      after: {
        personalId: personId,
        attachmentTypeId: typeId,
        filename: 'cédula escaneada.pdf',
        mime: 'application/pdf',
        size: PDF.length,
      },
    })
  })

  it('keeps only the base name of the uploaded file and types it by its bytes', async () => {
    const res = await upload(PNG, '../../etc/foto.png', 'application/octet-stream').expect(201)
    expect(res.body).toMatchObject({ filename: 'foto.png', mime: 'image/png' })
  })

  it('rejects other file types (415), files over 5 MB (413), missing parts (400) and unknown or inactive types (400)', async () => {
    const before = (await http().get(base()).set(bearer(users.consulta))).body.length
    await upload(Buffer.from('PK\u0003\u0004 zip ficticio'), 'x.zip', 'application/zip').expect(415)
    // Declared as PDF, but the bytes are not one.
    await upload(Buffer.from('texto plano'), 'x.pdf', 'application/pdf').expect(415)
    await upload(Buffer.concat([PDF, Buffer.alloc(ATTACHMENT_MAX_BYTES)]), 'x.pdf', 'application/pdf').expect(413)
    await http().post(base()).set(bearer(users.supervisor)).field('attachmentTypeId', typeId).expect(400)
    await http()
      .post(base())
      .set(bearer(users.supervisor))
      .attach('file', PDF, { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(400)
    await upload(PDF, 'x.pdf', 'application/pdf', 'not-a-uuid').expect(400)
    const unknown = await upload(PDF, 'x.pdf', 'application/pdf', randomUUID()).expect(400)
    expect(unknown.body.details).toEqual([{ path: 'attachmentTypeId', message: expect.any(String) }])
    await upload(PDF, 'x.pdf', 'application/pdf', inactiveTypeId).expect(400)
    expect((await http().get(base()).set(bearer(users.consulta))).body).toHaveLength(before)
  })

  it('deletes an attachment with an eliminar audit row; 404 afterwards and for another person', async () => {
    const created = await upload(PDF, 'borrar.pdf', 'application/pdf').expect(201)
    await http()
      .delete(`/api/personnel/${randomUUID()}/attachments/${created.body.id}`)
      .set(bearer(users.supervisor))
      .expect(404)
    await http().delete(`${base()}/${created.body.id}`).set(bearer(users.supervisor)).expect(204)
    expect(await db.select().from(personalAdjunto).where(eq(personalAdjunto.id, created.body.id))).toHaveLength(0)
    const rows = (await audits('eliminar')).filter((row) => row.entityId === created.body.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.changes).toMatchObject({ before: { filename: 'borrar.pdf', personalId: personId } })
    await http().get(`${base()}/${created.body.id}`).set(bearer(users.supervisor)).expect(404)
    await http().delete(`${base()}/${created.body.id}`).set(bearer(users.supervisor)).expect(404)
  })

  it('answers 404 for an unknown person, 403 to Consulta on writes and 401 without a token', async () => {
    await http().get(`/api/personnel/${randomUUID()}/attachments`).set(bearer(users.consulta)).expect(404)
    await http()
      .post(base())
      .set(bearer(users.consulta))
      .field('attachmentTypeId', typeId)
      .attach('file', PDF, { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(403)
    const [first] = (await http().get(base()).set(bearer(users.consulta))).body
    await http().delete(`${base()}/${first.id}`).set(bearer(users.consulta)).expect(403)
    await http().get(base()).expect(401)
  })
})
