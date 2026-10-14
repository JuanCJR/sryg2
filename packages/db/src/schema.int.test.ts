import { eq, getTableColumns, getTableName, sql } from 'drizzle-orm'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
  accesoUsuario,
  alerta,
  auditoria,
  bloqueo,
  catalogAircraft,
  catalogAttachmentType,
  catalogClassRating,
  catalogFunction,
  catalogLicenseType,
  catalogNationality,
  catalogTypeRating,
  certificadoMedico,
  habilitacionClase,
  habilitacionClaseAeronave,
  habilitacionTipo,
  licencia,
  licenciaObservacion,
  catalogLicenseObservation,
  personalAdjunto,
  personalAeronautico,
  recursoGrafico,
  usuario,
} from './schema'
import { openTestDb, pgErrorCode, truncateAll } from './test/test-db'

const { db, pool } = openTestDb()

const FK_VIOLATION = '23503'
const UNIQUE_VIOLATION = '23505'
const CHECK_VIOLATION = '23514'
const NOT_NULL_VIOLATION = '23502'

async function seedUser(email = 'admin@sryg.test') {
  const [row] = await db
    .insert(usuario)
    .values({ email, fullName: 'Admin', role: 'administrador', area: 'ambas', passwordHash: 'hash' })
    .returning()
  return row!
}

async function seedPersonal(userId: string, cedula = '12345678') {
  const [row] = await db
    .insert(personalAeronautico)
    .values({ cedula, firstNames: 'Ana', lastNames: 'Pérez', createdBy: userId, updatedBy: userId })
    .returning()
  return row!
}

async function seedLicenseType(nameEs = 'Piloto Comercial - Avión') {
  const [row] = await db
    .insert(catalogLicenseType)
    .values({ nameEs, nameEn: 'Commercial Pilot - Airplane', rav60Category: 'piloto_comercial' })
    .returning()
  return row!
}

async function seedLicencia(personalId: string, expiryDate: string | null = '2026-01-01') {
  const type = await seedLicenseType()
  const [row] = await db
    .insert(licencia)
    .values({ personalId, licenseTypeId: type.id, number: '12345678', issueDate: '2024-01-01', expiryDate })
    .returning()
  return row!
}

beforeEach(() => truncateAll(db))
afterAll(() => pool.end())

describe('schema', () => {
  it('creates the application tables', async () => {
    const result = await db.execute<{ table_name: string }>(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> '__drizzle_migrations'`,
    )
    expect(result.rows.map((r) => r.table_name).sort()).toEqual(
      [
        'acceso_usuario',
        'alerta',
        'auditoria',
        'bloqueo',
        'catalog_aircraft',
        'catalog_attachment_type',
        'catalog_class_rating',
        'catalog_document_type',
        'catalog_function',
        'catalog_license_observation',
        'catalog_license_type',
        'catalog_medical_observation',
        'catalog_nationality',
        'catalog_type_rating',
        'certificado_medico',
        'certificado_observacion',
        'habilitacion_clase',
        'habilitacion_clase_aeronave',
        'habilitacion_tipo',
        'licencia',
        'licencia_observacion',
        'parametro_sistema',
        'personal_adjunto',
        'personal_aeronautico',
        'recurso_grafico',
        'usuario',
      ].sort(),
    )
  })

  it('keeps certificado_medico free of clinical columns (BR-05)', () => {
    expect(Object.keys(getTableColumns(certificadoMedico)).sort()).toEqual(
      [
        'createdAt',
        'expiryDate',
        'id',
        'issueDate',
        'number',
        'personalId',
        'rav67Class',
        'restrictions',
        'status',
        'updatedAt',
        'verificationToken',
      ].sort(),
    )
    expect(getTableName(certificadoMedico)).toBe('certificado_medico')
  })

  it('replaces full_name and photo_ref on personal_aeronautico (D5, D21)', () => {
    const columns = Object.keys(getTableColumns(personalAeronautico))
    expect(columns).not.toContain('fullName')
    expect(columns).not.toContain('photoRef')
    expect(columns).toEqual(
      expect.arrayContaining([
        'firstNames',
        'lastNames',
        'documentTypeId',
        'nationalityId',
        'birthDate',
        'address',
        'photo',
        'photoMime',
        'signature',
        'signatureMime',
      ]),
    )
  })

  it('accepts the new audit actions', async () => {
    for (const action of ['emitir', 'restablecer_contrasena', 'adjuntar'] as const)
      expect(await pgErrorCode(() => db.insert(auditoria).values({ action, entity: 'x' }))).toBeUndefined()
  })
})

describe('usuario', () => {
  it('requires an area and defaults must_change_password to false (D4, D24)', async () => {
    const user = await seedUser()
    expect(user).toMatchObject({ area: 'ambas', mustChangePassword: false })
    const code = await pgErrorCode(() =>
      db.execute(
        sql`INSERT INTO usuario (email, full_name, role, password_hash) VALUES ('x@sryg.test', 'X', 'consulta', 'h')`,
      ),
    )
    expect(code).toBe(NOT_NULL_VIOLATION)
  })
})

describe('referential integrity', () => {
  it('rejects a licencia for a nonexistent personal', async () => {
    const type = await seedLicenseType()
    const code = await pgErrorCode(() =>
      db.insert(licencia).values({
        personalId: '00000000-0000-0000-0000-000000000000',
        licenseTypeId: type.id,
        number: '1',
        issueDate: '2024-01-01',
      }),
    )
    expect(code).toBe(FK_VIOLATION)
  })

  it('rejects deleting a personal that still has credentials (RESTRICT)', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    await db.insert(certificadoMedico).values({
      personalId: personal.id,
      rav67Class: 'clase_1',
      number: personal.cedula,
      issueDate: '2024-01-01',
      expiryDate: '2025-01-01',
    })
    const code = await pgErrorCode(() => db.delete(personalAeronautico).where(eq(personalAeronautico.id, personal.id)))
    expect(code).toBe(FK_VIOLATION)
  })

  it('rejects deleting a licencia that still has habilitaciones (RESTRICT)', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const lic = await seedLicencia(personal.id)
    const [model] = await db.insert(catalogTypeRating).values({ nameEs: 'B737' }).returning()
    const [fn] = await db.insert(catalogFunction).values({ nameEs: 'Capitán', nameEn: 'PIC' }).returning()
    await db
      .insert(habilitacionTipo)
      .values({ licenciaId: lic.id, typeRatingId: model!.id, functionId: fn!.id, expiryDate: '2025-01-01' })
    const code = await pgErrorCode(() => db.delete(licencia).where(eq(licencia.id, lic.id)))
    expect(code).toBe(FK_VIOLATION)
  })

  it('rejects deleting a catalog item that is in use (W1-11 deactivates instead)', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const lic = await seedLicencia(personal.id)
    const code = await pgErrorCode(() =>
      db.delete(catalogLicenseType).where(eq(catalogLicenseType.id, lic.licenseTypeId)),
    )
    expect(code).toBe(FK_VIOLATION)
  })

  it('links class ratings to N aircraft and licences to N observations', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const lic = await seedLicencia(personal.id)
    const [cls] = await db
      .insert(catalogClassRating)
      .values({ nameEs: 'Monomotores Terrestres', nameEn: 'Single Engine Land' })
      .returning()
    const aircraft = await db
      .insert(catalogAircraft)
      .values([{ nameEs: 'Cessna 172' }, { nameEs: 'Piper PA-28' }])
      .returning()
    const [rating] = await db
      .insert(habilitacionClase)
      .values({ licenciaId: lic.id, classRatingId: cls!.id, expiryDate: '2025-06-01' })
      .returning()
    await db
      .insert(habilitacionClaseAeronave)
      .values(aircraft.map((a) => ({ habilitacionClaseId: rating!.id, aircraftId: a.id })))
    const [obs] = await db
      .insert(catalogLicenseObservation)
      .values({ nameEs: 'No es válida para vuelos internacionales', nameEn: 'Not valid for international flights' })
      .returning()
    await db.insert(licenciaObservacion).values({ licenciaId: lic.id, observationId: obs!.id })
    const code = await pgErrorCode(() =>
      db.insert(licenciaObservacion).values({ licenciaId: lic.id, observationId: obs!.id }),
    )
    expect(code).toBe(UNIQUE_VIOLATION)
    expect(await db.select().from(habilitacionClaseAeronave)).toHaveLength(2)
  })

  it('deletes a person attachments with the person', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const [type] = await db.insert(catalogAttachmentType).values({ nameEs: 'Cédula', nameEn: 'ID card' }).returning()
    await db.insert(personalAdjunto).values({
      personalId: personal.id,
      attachmentTypeId: type!.id,
      filename: 'cedula.pdf',
      mime: 'application/pdf',
      data: Buffer.from('%PDF-1.4'),
      size: 8,
      createdBy: user.id,
    })
    await db.delete(personalAeronautico).where(eq(personalAeronautico.id, personal.id))
    expect(await db.select().from(personalAdjunto)).toHaveLength(0)
  })
})

describe('uniqueness', () => {
  it('rejects two personal with the same cedula', async () => {
    const user = await seedUser()
    await seedPersonal(user.id, '12345678')
    expect(await pgErrorCode(() => seedPersonal(user.id, '12345678'))).toBe(UNIQUE_VIOLATION)
  })

  it('enforces unique email case-insensitively (lower(email))', async () => {
    await seedUser('Admin@Sryg.test')
    expect(await pgErrorCode(() => seedUser('admin@sryg.TEST'))).toBe(UNIQUE_VIOLATION)
  })

  it('enforces unique catalog names case-insensitively', async () => {
    await db.insert(catalogNationality).values({ nameEs: 'Venezolana', nameEn: 'Venezuelan' })
    expect(await pgErrorCode(() => db.insert(catalogNationality).values({ nameEs: 'VENEZOLANA' }))).toBe(
      UNIQUE_VIOLATION,
    )
  })

  it('generates a distinct verification token per credential', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const lic = await seedLicencia(personal.id)
    const [cert] = await db
      .insert(certificadoMedico)
      .values({
        personalId: personal.id,
        rav67Class: 'clase_2',
        number: '1',
        issueDate: '2024-01-01',
        expiryDate: '2025-01-01',
      })
      .returning()
    expect(lic.verificationToken).toMatch(/^[0-9a-f-]{36}$/)
    expect(cert!.verificationToken).not.toBe(lic.verificationToken)
  })

  it('keeps one alert per credential and kind', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const lic = await seedLicencia(personal.id)
    const value = {
      personalId: personal.id,
      credentialKind: 'licencia',
      credentialId: lic.id,
      kind: 'vencida',
      dueDate: '2026-01-01',
    } as const
    await db.insert(alerta).values(value)
    expect(await pgErrorCode(() => db.insert(alerta).values(value))).toBe(UNIQUE_VIOLATION)
    expect(await pgErrorCode(() => db.insert(alerta).values({ ...value, kind: 'proxima' }))).toBeUndefined()
  })
})

describe('check constraints', () => {
  it.each(['12345', '1234567890', 'V-12345678', 'abcdefgh'])('rejects cedula %j', async (cedula) => {
    const user = await seedUser()
    expect(await pgErrorCode(() => seedPersonal(user.id, cedula))).toBe(CHECK_VIOLATION)
  })

  it('requires expiry_date after issue_date on certificado_medico', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const code = await pgErrorCode(() =>
      db.insert(certificadoMedico).values({
        personalId: personal.id,
        rav67Class: 'clase_2',
        number: '1',
        issueDate: '2025-01-01',
        expiryDate: '2024-01-01',
      }),
    )
    expect(code).toBe(CHECK_VIOLATION)
  })

  it('allows a licencia without expiry (D20) but not one that expires before it is issued', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const lic = await seedLicencia(personal.id, null)
    expect(lic.expiryDate).toBeNull()
    const code = await pgErrorCode(() =>
      db.insert(licencia).values({
        personalId: personal.id,
        licenseTypeId: lic.licenseTypeId,
        number: '1',
        issueDate: '2025-01-01',
        expiryDate: '2024-01-01',
      }),
    )
    expect(code).toBe(CHECK_VIOLATION)
  })

  it('requires an image and its MIME type together (D5)', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const set = (values: Partial<typeof personalAeronautico.$inferInsert>) =>
      pgErrorCode(() => db.update(personalAeronautico).set(values).where(eq(personalAeronautico.id, personal.id)))
    expect(await set({ photo: Buffer.from([1, 2]) })).toBe(CHECK_VIOLATION)
    expect(await set({ signatureMime: 'image/png' })).toBe(CHECK_VIOLATION)
    expect(await set({ photo: Buffer.from([1, 2]), photoMime: 'image/jpeg' })).toBeUndefined()
    const [row] = await db.select().from(personalAeronautico).where(eq(personalAeronautico.id, personal.id))
    expect(row!.photo).toEqual(Buffer.from([1, 2]))
  })

  it('limits attachments to 5 MB and keeps size equal to the stored bytes (D21)', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const [type] = await db.insert(catalogAttachmentType).values({ nameEs: 'Otro' }).returning()
    const attach = (data: Buffer, size: number) =>
      pgErrorCode(() =>
        db.insert(personalAdjunto).values({
          personalId: personal.id,
          attachmentTypeId: type!.id,
          filename: 'a.pdf',
          mime: 'application/pdf',
          data,
          size,
          createdBy: user.id,
        }),
      )
    expect(await attach(Buffer.alloc(3), 4)).toBe(CHECK_VIOLATION)
    expect(await attach(Buffer.alloc(5 * 1024 * 1024 + 1), 5 * 1024 * 1024 + 1)).toBe(CHECK_VIOLATION)
    expect(await attach(Buffer.alloc(3), 3)).toBeUndefined()
  })

  it('requires a positive validity on license types', async () => {
    const code = await pgErrorCode(() =>
      db.insert(catalogLicenseType).values({ nameEs: 'X', rav60Category: 'piloto_privado', validityMonths: 0 }),
    )
    expect(code).toBe(CHECK_VIOLATION)
    const type = await seedLicenseType()
    expect(type).toMatchObject({
      appliesExpiry: true,
      validityIsPlaceholder: true,
      active: true,
      requiredMedicalClass: null,
    })
  })

  it('requires acknowledger data exactly when an alert is acknowledged', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const base = {
      personalId: personal.id,
      credentialKind: 'certificado_medico',
      credentialId: personal.id,
      kind: 'proxima',
      dueDate: '2026-01-01',
    } as const
    expect(await pgErrorCode(() => db.insert(alerta).values({ ...base, acknowledgedBy: user.id }))).toBe(
      CHECK_VIOLATION,
    )
  })

  it('requires resolver data exactly when a bloqueo is resolved', async () => {
    const user = await seedUser()
    const personal = await seedPersonal(user.id)
    const base = { personalId: personal.id, type: 'administrativo', reason: 'Docs', createdBy: user.id } as const
    expect(await pgErrorCode(() => db.insert(bloqueo).values({ ...base, status: 'resuelto' }))).toBe(CHECK_VIOLATION)
    expect(await pgErrorCode(() => db.insert(bloqueo).values({ ...base, status: 'activo', resolvedBy: user.id }))).toBe(
      CHECK_VIOLATION,
    )
    expect(
      await pgErrorCode(() =>
        db.insert(bloqueo).values({ ...base, status: 'resuelto', resolvedBy: user.id, resolvedAt: new Date() }),
      ),
    ).toBeUndefined()
  })
})

describe('acceso_usuario and recurso_grafico', () => {
  it('keeps access rows of unknown identifiers and of deleted users (D23)', async () => {
    const user = await seedUser()
    await db.insert(accesoUsuario).values([
      { usuarioId: user.id, identifier: user.email, ip: '10.0.0.1', success: true },
      { usuarioId: null, identifier: 'ghost@sryg.test', ip: '10.0.0.2', success: false },
    ])
    await db.delete(usuario).where(eq(usuario.id, user.id))
    const rows = await db.select().from(accesoUsuario).orderBy(accesoUsuario.id)
    expect(rows.map((r) => [r.usuarioId, r.success])).toEqual([
      [null, true],
      [null, false],
    ])
  })

  it('stores one image per graphic resource kind (D18)', async () => {
    const value = { kind: 'logo_inac', data: Buffer.from([137, 80]), mime: 'image/png' } as const
    await db.insert(recursoGrafico).values(value)
    expect(await pgErrorCode(() => db.insert(recursoGrafico).values(value))).toBe(UNIQUE_VIOLATION)
  })
})
