import { randomInt, randomUUID } from 'node:crypto'
import { bloqueo, catalogLicenseType, createDb, personalAeronautico, usuario } from '@sryg/db'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DrizzleActiveBlockQuery } from './infrastructure/drizzle-active-block-query'
import { DrizzleValidityParametersReader } from './infrastructure/drizzle-validity-parameters-reader'
import { MissingParameterError } from './domain/validity-parameters-reader'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg'
const { db, pool } = createDb(DATABASE_URL)
const RUN = randomUUID().slice(0, 8)

describe('shared credential core', () => {
  let userId: string
  const people: Record<'blocked' | 'resolved' | 'clear', string> = { blocked: '', resolved: '', clear: '' }
  let typeIds: Record<'expiring' | 'permanent', string>

  beforeAll(async () => {
    const [user] = await db
      .insert(usuario)
      .values({
        email: `core-${RUN}@sryg.test`,
        fullName: 'Core',
        role: 'administrador',
        area: 'ambas',
        passwordHash: 'x',
      })
      .returning()
    userId = user!.id
    for (const key of Object.keys(people) as Array<keyof typeof people>) {
      const [row] = await db
        .insert(personalAeronautico)
        .values({
          cedula: String(randomInt(10_000_000, 99_999_999)),
          firstNames: 'Core',
          lastNames: key,
          createdBy: userId,
          updatedBy: userId,
        })
        .returning()
      people[key] = row!.id
    }
    const base = { personalId: '', type: 'administrativo', reason: 'Prueba', createdBy: userId } as const
    await db.insert(bloqueo).values([
      { ...base, personalId: people.blocked },
      { ...base, personalId: people.resolved, status: 'resuelto', resolvedBy: userId, resolvedAt: new Date() },
    ])
    const types = await db
      .insert(catalogLicenseType)
      .values([
        {
          nameEs: `${RUN} Expira`,
          rav60Category: 'piloto_comercial',
          validityMonths: 24,
          validityIsPlaceholder: false,
        },
        { nameEs: `${RUN} Permanente`, rav60Category: 'tecnico_mantenimiento', appliesExpiry: false },
      ])
      .returning()
    typeIds = { expiring: types[0]!.id, permanent: types[1]!.id }
  })
  afterAll(async () => {
    for (const id of Object.values(people)) {
      await db.delete(bloqueo).where(eq(bloqueo.personalId, id))
      await db.delete(personalAeronautico).where(eq(personalAeronautico.id, id))
    }
    for (const id of Object.values(typeIds)) await db.delete(catalogLicenseType).where(eq(catalogLicenseType.id, id))
    await db.delete(usuario).where(eq(usuario.id, userId))
    await pool.end()
  })

  describe('ActiveBlockQuery', () => {
    const query = new DrizzleActiveBlockQuery(db)

    it('is true only while a person has an unresolved block (BR-07)', async () => {
      expect(await query.hasActiveBlock(people.blocked)).toBe(true)
      expect(await query.hasActiveBlock(people.resolved)).toBe(false)
      expect(await query.hasActiveBlock(people.clear)).toBe(false)
    })

    it('answers for many people at once', async () => {
      expect(await query.withActiveBlock(Object.values(people))).toEqual(new Set([people.blocked]))
      expect(await query.withActiveBlock([])).toEqual(new Set())
    })
  })

  describe('ValidityParametersReader', () => {
    const reader = new DrizzleValidityParametersReader(db)

    it('reads the alert threshold and the RAV 67 validity, flagging placeholders (D3)', async () => {
      expect(await reader.alertThresholdDays()).toEqual({ value: 30, isPlaceholder: true })
      expect(await reader.medicalValidityMonths('clase_2')).toEqual({ value: 12, isPlaceholder: true })
    })

    it('reads the validity of a license type, or null for an unknown type (D20)', async () => {
      expect(await reader.licenseTypeValidity(typeIds.expiring)).toEqual({
        appliesExpiry: true,
        validityMonths: 24,
        isPlaceholder: false,
      })
      expect(await reader.licenseTypeValidity(typeIds.permanent)).toEqual({
        appliesExpiry: false,
        validityMonths: null,
        isPlaceholder: true,
      })
      expect(await reader.licenseTypeValidity(randomUUID())).toBeNull()
    })

    it('fails loudly when a parameter is missing instead of inventing a number', async () => {
      const missing = new DrizzleValidityParametersReader(db, { alertThresholdKey: `missing.${RUN}` })
      await expect(missing.alertThresholdDays()).rejects.toBeInstanceOf(MissingParameterError)
    })
  })
})
