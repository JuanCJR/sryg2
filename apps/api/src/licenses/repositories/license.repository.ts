import {
  catalogAircraft,
  catalogClassRating,
  catalogFunction,
  catalogLicenseObservation,
  catalogLicenseType,
  catalogTypeRating,
  certificadoMedico,
  type DbExecutor,
  habilitacionClase,
  habilitacionClaseAeronave,
  habilitacionTipo,
  licencia,
  licenciaObservacion,
  personalAeronautico,
} from '@sryg/db'
import type { Rav67Class } from '@sryg/types'
import { and, eq, gte, inArray } from 'drizzle-orm'
import type {
  ClassRatingRecord,
  LicenseCatalog,
  LicenseFields,
  LicenseRecord,
  LicenseTypeInfo,
  PersonRef,
  TypeRatingRecord,
} from '../dtos/license-record.dto'

const CATALOG_TABLES = {
  'license-observations': catalogLicenseObservation,
  'type-ratings': catalogTypeRating,
  functions: catalogFunction,
  'class-ratings': catalogClassRating,
  aircraft: catalogAircraft,
} satisfies Record<LicenseCatalog, unknown>

// Every catalog shares id/active; this shape is enough to query any of them.
type CatalogTable = typeof catalogAircraft

const typeRatingFields = {
  id: habilitacionTipo.id,
  licenseId: habilitacionTipo.licenciaId,
  typeRatingId: habilitacionTipo.typeRatingId,
  functionId: habilitacionTipo.functionId,
  expiryDate: habilitacionTipo.expiryDate,
}

/** Works against the pool or a transaction handle; the transaction runner builds one per transaction. */
export class LicenseRepository {
  constructor(private readonly executor: DbExecutor) {}

  async findPerson(id: string): Promise<PersonRef | null> {
    const [row] = await this.executor
      .select({ id: personalAeronautico.id, cedula: personalAeronautico.cedula })
      .from(personalAeronautico)
      .where(eq(personalAeronautico.id, id))
      .limit(1)
    return row ?? null
  }

  async findLicenseType(id: string): Promise<LicenseTypeInfo | null> {
    const [row] = await this.executor
      .select({
        id: catalogLicenseType.id,
        nameEs: catalogLicenseType.nameEs,
        requiredMedicalClass: catalogLicenseType.requiredMedicalClass,
        active: catalogLicenseType.active,
      })
      .from(catalogLicenseType)
      .where(eq(catalogLicenseType.id, id))
      .limit(1)
    return row ?? null
  }

  /** A certificate of `rav67Class` that expires on `today` or later (D13). */
  async hasValidMedicalCertificate(personalId: string, rav67Class: Rav67Class, today: string): Promise<boolean> {
    const rows = await this.executor
      .select({ id: certificadoMedico.id })
      .from(certificadoMedico)
      .where(
        and(
          eq(certificadoMedico.personalId, personalId),
          eq(certificadoMedico.rav67Class, rav67Class),
          gte(certificadoMedico.expiryDate, today),
        ),
      )
      .limit(1)
    return rows.length > 0
  }

  /** The subset of `ids` that exists in `catalog` and is active. */
  async activeCatalogIds(catalog: LicenseCatalog, ids: readonly string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set()
    const table = CATALOG_TABLES[catalog] as unknown as CatalogTable
    const rows = await this.executor
      .select({ id: table.id })
      .from(table)
      .where(and(inArray(table.id, [...ids]), eq(table.active, true)))
    return new Set(rows.map((r) => r.id))
  }

  /** Locks the row for the rest of the transaction, so concurrent trámites serialize (NFR-09). */
  async findLicense(id: string): Promise<LicenseRecord | null> {
    const [row] = await this.executor
      .select({
        id: licencia.id,
        personalId: licencia.personalId,
        licenseTypeId: licencia.licenseTypeId,
        number: licencia.number,
        issueDate: licencia.issueDate,
        expiryDate: licencia.expiryDate,
      })
      .from(licencia)
      .where(eq(licencia.id, id))
      .limit(1)
      .for('update')
    if (!row) return null
    const observations = await this.executor
      .select({ id: licenciaObservacion.observationId })
      .from(licenciaObservacion)
      .where(eq(licenciaObservacion.licenciaId, id))
    return { ...row, observationIds: observations.map((o) => o.id) }
  }

  async insertLicense(data: { personalId: string; licenseTypeId: string } & LicenseFields): Promise<string> {
    const [row] = await this.executor.insert(licencia).values(data).returning({ id: licencia.id })
    return row!.id
  }

  async updateLicense(id: string, data: LicenseFields): Promise<void> {
    await this.executor.update(licencia).set(data).where(eq(licencia.id, id))
  }

  async setObservations(licenseId: string, observationIds: readonly string[]): Promise<void> {
    await this.executor.delete(licenciaObservacion).where(eq(licenciaObservacion.licenciaId, licenseId))
    if (observationIds.length === 0) return
    await this.executor
      .insert(licenciaObservacion)
      .values(observationIds.map((observationId) => ({ licenciaId: licenseId, observationId })))
  }

  async findTypeRating(id: string): Promise<TypeRatingRecord | null> {
    const [row] = await this.executor.select(typeRatingFields).from(habilitacionTipo).where(eq(habilitacionTipo.id, id))
    return row ?? null
  }

  async insertTypeRating(data: Omit<TypeRatingRecord, 'id'>): Promise<TypeRatingRecord> {
    const [row] = await this.executor
      .insert(habilitacionTipo)
      .values({
        licenciaId: data.licenseId,
        typeRatingId: data.typeRatingId,
        functionId: data.functionId,
        expiryDate: data.expiryDate,
      })
      .returning(typeRatingFields)
    return row!
  }

  async updateTypeRatingExpiry(id: string, expiryDate: string): Promise<void> {
    await this.executor.update(habilitacionTipo).set({ expiryDate }).where(eq(habilitacionTipo.id, id))
  }

  async deleteTypeRating(id: string): Promise<void> {
    await this.executor.delete(habilitacionTipo).where(eq(habilitacionTipo.id, id))
  }

  async findClassRating(id: string): Promise<ClassRatingRecord | null> {
    const [row] = await this.executor
      .select({
        id: habilitacionClase.id,
        licenseId: habilitacionClase.licenciaId,
        classRatingId: habilitacionClase.classRatingId,
        expiryDate: habilitacionClase.expiryDate,
      })
      .from(habilitacionClase)
      .where(eq(habilitacionClase.id, id))
    if (!row) return null
    const aircraft = await this.executor
      .select({ id: habilitacionClaseAeronave.aircraftId })
      .from(habilitacionClaseAeronave)
      .where(eq(habilitacionClaseAeronave.habilitacionClaseId, id))
    return { ...row, aircraftIds: aircraft.map((a) => a.id) }
  }

  async insertClassRating(data: Omit<ClassRatingRecord, 'id'>): Promise<ClassRatingRecord> {
    const [row] = await this.executor
      .insert(habilitacionClase)
      .values({ licenciaId: data.licenseId, classRatingId: data.classRatingId, expiryDate: data.expiryDate })
      .returning({ id: habilitacionClase.id })
    if (data.aircraftIds.length > 0) {
      await this.executor
        .insert(habilitacionClaseAeronave)
        .values(data.aircraftIds.map((aircraftId) => ({ habilitacionClaseId: row!.id, aircraftId })))
    }
    return { id: row!.id, ...data }
  }

  async updateClassRatingExpiry(id: string, expiryDate: string): Promise<void> {
    await this.executor.update(habilitacionClase).set({ expiryDate }).where(eq(habilitacionClase.id, id))
  }

  async deleteClassRating(id: string): Promise<void> {
    // The aircraft links go with it (ON DELETE CASCADE).
    await this.executor.delete(habilitacionClase).where(eq(habilitacionClase.id, id))
  }
}
