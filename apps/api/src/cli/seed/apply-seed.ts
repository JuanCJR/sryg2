import {
  bloqueo,
  catalogAircraft,
  catalogAttachmentType,
  catalogClassRating,
  catalogDocumentType,
  catalogFunction,
  catalogLicenseObservation,
  catalogLicenseType,
  catalogMedicalObservation,
  catalogNationality,
  catalogTypeRating,
  certificadoMedico,
  certificadoObservacion,
  type Db,
  type DbExecutor,
  habilitacionClase,
  habilitacionClaseAeronave,
  habilitacionTipo,
  licencia,
  licenciaObservacion,
  parametroSistema,
  personalAeronautico,
  usuario,
} from '@sryg/db'
import { PLACEHOLDER_SETTINGS } from '@sryg/types'
import { inArray, sql } from 'drizzle-orm'
import type { SeedCatalogItem, SeedData } from './build-seed-data'

export interface ApplySeedOptions {
  /** Shared by every seeded user; hashed once. */
  password: string
  hasher: { hash(plain: string): Promise<string> }
}

type CatalogTable = typeof catalogNationality

/** Seed id → id actually stored (an equal natural key may already exist with another id). */
type IdMap = Map<string, string>

// Every catalog shares id/name_es; typed as one of them so a single query serves all ten.
async function upsertCatalog(tx: DbExecutor, catalog: unknown, items: SeedCatalogItem[], ids: IdMap) {
  const table = catalog as CatalogTable
  await tx.insert(table).values(items).onConflictDoNothing()
  const stored = await tx
    .select({ id: table.id, key: sql<string>`lower(${table.nameEs})` })
    .from(table)
    .where(
      inArray(
        sql`lower(${table.nameEs})`,
        items.map((i) => i.nameEs.toLowerCase()),
      ),
    )
  const byKey = new Map(stored.map((r) => [r.key, r.id]))
  for (const item of items) ids.set(item.id, byKey.get(item.nameEs.toLowerCase())!)
}

// D3 placeholders: normally loaded by the migration; restored here if missing.
async function insertSettings(tx: DbExecutor) {
  await tx
    .insert(parametroSistema)
    .values(Object.entries(PLACEHOLDER_SETTINGS).map(([key, value]) => ({ key, value, isPlaceholder: true })))
    .onConflictDoNothing()
}

async function upsertCatalogs(tx: DbExecutor, catalogs: SeedData['catalogs'], ids: IdMap) {
  await upsertCatalog(tx, catalogLicenseType, catalogs.licenseTypes, ids)
  await upsertCatalog(tx, catalogTypeRating, catalogs.typeRatings, ids)
  await upsertCatalog(tx, catalogClassRating, catalogs.classRatings, ids)
  await upsertCatalog(tx, catalogAircraft, catalogs.aircraft, ids)
  await upsertCatalog(tx, catalogFunction, catalogs.functions, ids)
  await upsertCatalog(tx, catalogLicenseObservation, catalogs.licenseObservations, ids)
  await upsertCatalog(tx, catalogMedicalObservation, catalogs.medicalObservations, ids)
  await upsertCatalog(tx, catalogDocumentType, catalogs.documentTypes, ids)
  await upsertCatalog(tx, catalogAttachmentType, catalogs.attachmentTypes, ids)
  await upsertCatalog(tx, catalogNationality, catalogs.nationalities, ids)
}

/**
 * Loads only the system settings and the reference catalogs, in one transaction: the production
 * seed. Idempotent; items that already exist under the same name (any case) are left untouched, so
 * catalogs edited by an administrator are never overwritten.
 */
export async function applySeedCatalogs(db: Db, catalogs: SeedData['catalogs']): Promise<void> {
  await db.transaction(async (tx) => {
    await insertSettings(tx)
    await upsertCatalogs(tx, catalogs, new Map())
  })
}

/**
 * Loads the development data set in one transaction. Idempotent: rows keep deterministic ids and
 * every insert skips conflicts, so a second run changes nothing. Catalog items, users and people
 * that already exist under the same name, email or cedula are reused rather than duplicated.
 */
export async function applySeed(db: Db, data: SeedData, options: ApplySeedOptions): Promise<void> {
  const passwordHash = await options.hasher.hash(options.password)
  await db.transaction(async (tx) => {
    const ids: IdMap = new Map()
    const id = (seedId: string) => ids.get(seedId) ?? seedId

    await insertSettings(tx)

    await tx
      .insert(usuario)
      .values(data.users.map((u) => ({ ...u, passwordHash, mustChangePassword: false })))
      .onConflictDoNothing()
    const storedUsers = await tx
      .select({ id: usuario.id, email: usuario.email })
      .from(usuario)
      .where(
        inArray(
          sql`lower(${usuario.email})`,
          data.users.map((u) => u.email.toLowerCase()),
        ),
      )
    const userByEmail = new Map(storedUsers.map((u) => [u.email.toLowerCase(), u.id]))
    for (const user of data.users) ids.set(user.id, userByEmail.get(user.email.toLowerCase())!)

    await upsertCatalogs(tx, data.catalogs, ids)

    const admin = data.users.find((u) => u.role === 'administrador' && u.area === 'ambas')!
    await tx
      .insert(personalAeronautico)
      .values(
        data.personnel.map((p) => ({
          ...p,
          documentTypeId: id(p.documentTypeId),
          nationalityId: id(p.nationalityId),
          createdBy: id(admin.id),
          updatedBy: id(admin.id),
        })),
      )
      .onConflictDoNothing()
    const storedPeople = await tx
      .select({ id: personalAeronautico.id, cedula: personalAeronautico.cedula })
      .from(personalAeronautico)
      .where(
        inArray(
          personalAeronautico.cedula,
          data.personnel.map((p) => p.cedula),
        ),
      )
    const personByCedula = new Map(storedPeople.map((p) => [p.cedula, p.id]))
    for (const person of data.personnel) ids.set(person.id, personByCedula.get(person.cedula)!)

    await tx
      .insert(licencia)
      .values(
        data.licenses.map((l) => ({
          id: l.id,
          personalId: id(l.personalId),
          licenseTypeId: id(l.licenseTypeId),
          number: l.number,
          issueDate: l.issueDate,
          expiryDate: l.expiryDate,
          verificationToken: l.verificationToken,
        })),
      )
      .onConflictDoNothing()
    const licenseObservations = data.licenses.flatMap((l) =>
      l.observationIds.map((o) => ({ licenciaId: l.id, observationId: id(o) })),
    )
    if (licenseObservations.length)
      await tx.insert(licenciaObservacion).values(licenseObservations).onConflictDoNothing()

    if (data.typeRatings.length)
      await tx
        .insert(habilitacionTipo)
        .values(data.typeRatings.map((r) => ({ ...r, typeRatingId: id(r.typeRatingId), functionId: id(r.functionId) })))
        .onConflictDoNothing()
    if (data.classRatings.length) {
      await tx
        .insert(habilitacionClase)
        .values(
          data.classRatings.map((r) => ({
            id: r.id,
            licenciaId: r.licenciaId,
            classRatingId: id(r.classRatingId),
            expiryDate: r.expiryDate,
          })),
        )
        .onConflictDoNothing()
      await tx
        .insert(habilitacionClaseAeronave)
        .values(
          data.classRatings.flatMap((r) =>
            r.aircraftIds.map((a) => ({ habilitacionClaseId: r.id, aircraftId: id(a) })),
          ),
        )
        .onConflictDoNothing()
    }

    if (data.medicalCertificates.length) {
      await tx
        .insert(certificadoMedico)
        .values(
          data.medicalCertificates.map((c) => ({
            id: c.id,
            personalId: id(c.personalId),
            rav67Class: c.rav67Class,
            number: c.number,
            issueDate: c.issueDate,
            expiryDate: c.expiryDate,
            restrictions: c.restrictions,
            verificationToken: c.verificationToken,
          })),
        )
        .onConflictDoNothing()
      const certificateObservations = data.medicalCertificates.flatMap((c) =>
        c.observationIds.map((o) => ({ certificadoMedicoId: c.id, observationId: id(o) })),
      )
      if (certificateObservations.length)
        await tx.insert(certificadoObservacion).values(certificateObservations).onConflictDoNothing()
    }

    if (data.blocks.length)
      await tx
        .insert(bloqueo)
        .values(
          data.blocks.map((b) => ({
            ...b,
            personalId: id(b.personalId),
            createdBy: id(b.createdBy),
            resolvedBy: b.resolvedBy ? id(b.resolvedBy) : null,
            resolvedAt: b.resolvedBy ? new Date() : null,
          })),
        )
        .onConflictDoNothing()
  })
}
