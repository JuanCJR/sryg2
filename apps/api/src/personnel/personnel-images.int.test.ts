import { randomBytes, randomInt, randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { auditoria, createDb, personalAeronautico } from '@sryg/db'
import { PERSONNEL_IMAGE_MAX_BYTES } from '@sryg/types'
import { and, eq } from 'drizzle-orm'
import sharp from 'sharp'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp } from '../test/create-test-app'
import { createTestUsers, deleteTestUsers, type TestUser } from '../test/test-users'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
const CEDULA = String(randomInt(10_000_000, 99_999_999))

/** Random pixels compress badly, so the server has to work to reach 200 KB. */
const noise = (width: number, height: number, channels: 3 | 4 = 3) =>
  sharp(randomBytes(width * height * channels), { raw: { width, height, channels } })

/** A binary response body as a Buffer (supertest leaves unknown types unparsed). */
const binary = (req: request.Test) =>
  req.buffer(true).parse((res, done) => {
    const chunks: Buffer[] = []
    res.on('data', (chunk: Buffer) => chunks.push(chunk))
    res.on('end', () => done(null, Buffer.concat(chunks)))
  })

describe('PUT/GET /api/personnel/:id/photo and /signature (D5)', () => {
  let app: INestApplication
  let users: Record<'supervisor' | 'consulta', TestUser>
  let personId: string
  const http = () => request(app.getHttpServer())
  const bearer = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` })
  const audits = () =>
    db
      .select()
      .from(auditoria)
      .where(and(eq(auditoria.entityId, personId), eq(auditoria.action, 'actualizar')))

  beforeAll(async () => {
    app = await createTestApp()
    users = await createTestUsers(db, app, {
      supervisor: { role: 'supervisor', area: 'medicina' },
      consulta: { role: 'consulta', area: 'ambas' },
    })
    const res = await http()
      .post('/api/personnel')
      .set(bearer(users.supervisor))
      .send({ cedula: CEDULA, firstNames: 'Persona', lastNames: 'Con Foto Ficticia' })
      .expect(201)
    personId = res.body.id
  })
  afterAll(async () => {
    await app.close()
    await db.delete(personalAeronautico).where(eq(personalAeronautico.cedula, CEDULA))
    await deleteTestUsers(db, users)
    await pool.end()
  })

  it('answers 404 while there is no photo or signature yet', async () => {
    await http().get(`/api/personnel/${personId}/photo`).set(bearer(users.consulta)).expect(404)
    await http().get(`/api/personnel/${personId}/signature`).set(bearer(users.consulta)).expect(404)
  })

  it('compresses a large photo to a JPEG of 200 KB at most and audits the change', async () => {
    const upload = await noise(1600, 1600).jpeg({ quality: 100 }).toBuffer()
    expect(upload.length).toBeGreaterThan(PERSONNEL_IMAGE_MAX_BYTES)

    const res = await http()
      .put(`/api/personnel/${personId}/photo`)
      .set(bearer(users.supervisor))
      .attach('file', upload, { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .expect(200)
    expect(res.body).toMatchObject({ id: personId, hasPhoto: true, hasSignature: false })

    const photo = await binary(http().get(`/api/personnel/${personId}/photo`).set(bearer(users.consulta))).expect(200)
    expect(photo.headers['content-type']).toBe('image/jpeg')
    const bytes = photo.body as Buffer
    expect(bytes.length).toBeLessThanOrEqual(PERSONNEL_IMAGE_MAX_BYTES)
    expect((await sharp(bytes).metadata()).format).toBe('jpeg')

    const rows = await audits()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ actorId: users.supervisor.id, entity: 'personal_aeronautico' })
    expect(rows[0]?.changes).toEqual({
      before: { hasPhoto: false },
      after: { hasPhoto: true, photoMime: 'image/jpeg', photoSize: bytes.length },
    })
  })

  it('keeps a signature as PNG (transparency) within 200 KB', async () => {
    const upload = await noise(1200, 500, 4).webp({ lossless: true }).toBuffer()
    await http()
      .put(`/api/personnel/${personId}/signature`)
      .set(bearer(users.supervisor))
      .attach('file', upload, { filename: 'firma.webp', contentType: 'image/webp' })
      .expect(200)
      .expect((res) => expect(res.body.hasSignature).toBe(true))
    const signature = await binary(http().get(`/api/personnel/${personId}/signature`).set(bearer(users.consulta)))
    expect(signature.status).toBe(200)
    expect(signature.headers['content-type']).toBe('image/png')
    expect((signature.body as Buffer).length).toBeLessThanOrEqual(PERSONNEL_IMAGE_MAX_BYTES)
    expect((await sharp(signature.body as Buffer).metadata()).hasAlpha).toBe(true)
  })

  it('rejects files that are not JPEG, PNG or WebP images (415) or are missing (400), changing nothing', async () => {
    const before = (await audits()).length
    await http()
      .put(`/api/personnel/${personId}/photo`)
      .set(bearer(users.supervisor))
      .attach('file', Buffer.from('%PDF-1.4 ficticio'), { filename: 'x.pdf', contentType: 'application/pdf' })
      .expect(415)
    // Declared as an image but not one: the bytes are what counts.
    await http()
      .put(`/api/personnel/${personId}/photo`)
      .set(bearer(users.supervisor))
      .attach('file', Buffer.from('not an image'), { filename: 'x.png', contentType: 'image/png' })
      .expect(415)
    await http().put(`/api/personnel/${personId}/photo`).set(bearer(users.supervisor)).expect(400)
    await http().put(`/api/personnel/${personId}/portrait`).set(bearer(users.supervisor)).expect(404)
    expect(await audits()).toHaveLength(before)
  })

  it('rejects uploads over 5 MB with 413', async () => {
    const huge = Buffer.concat([
      await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } })
        .png()
        .toBuffer(),
      Buffer.alloc(5 * 1024 * 1024),
    ])
    await http()
      .put(`/api/personnel/${personId}/photo`)
      .set(bearer(users.supervisor))
      .attach('file', huge, { filename: 'x.png', contentType: 'image/png' })
      .expect(413)
  })

  it('answers 404 for an unknown person, 403 to Consulta and 401 without a token', async () => {
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'blue' } })
      .png()
      .toBuffer()
    await http()
      .put(`/api/personnel/${randomUUID()}/photo`)
      .set(bearer(users.supervisor))
      .attach('file', png, { filename: 'x.png', contentType: 'image/png' })
      .expect(404)
    await http().get(`/api/personnel/${randomUUID()}/photo`).set(bearer(users.supervisor)).expect(404)
    await http()
      .put(`/api/personnel/${personId}/photo`)
      .set(bearer(users.consulta))
      .attach('file', png, { filename: 'x.png', contentType: 'image/png' })
      .expect(403)
    await http().get(`/api/personnel/${personId}/photo`).expect(401)
  })
})
