import {
  auditoria,
  catalogAircraft,
  catalogClassRating,
  catalogFunction,
  catalogLicenseObservation,
  catalogLicenseType,
  catalogTypeRating,
  type DbExecutor,
  habilitacionClase,
  habilitacionClaseAeronave,
  habilitacionTipo,
  licencia,
  licenciaObservacion,
  personalAeronautico,
  usuario,
} from '@sryg/db'
import type { CatalogRef, LicenseHistoryEntryDto, LicenseListQuery, Paginated } from '@sryg/types'
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, type SQL, sql } from 'drizzle-orm'
import { CLASS_RATING_ENTITY, LICENSE_ENTITY, TYPE_RATING_ENTITY } from '../domain/license'
import type { LicenseListItemView, LicenseReader, LicenseView } from '../domain/license-reader'

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

const ref = (table: { id: unknown; nameEs: unknown; nameEn: unknown }) =>
  ({ id: table.id, nameEs: table.nameEs, nameEn: table.nameEn }) as {
    id: typeof catalogAircraft.id
    nameEs: typeof catalogAircraft.nameEs
    nameEn: typeof catalogAircraft.nameEn
  }

const groupBy = <T, K>(rows: T[], key: (row: T) => K) => {
  const map = new Map<K, T[]>()
  for (const row of rows) map.set(key(row), [...(map.get(key(row)) ?? []), row])
  return map
}

const byName = (a: CatalogRef, b: CatalogRef) => a.nameEs.localeCompare(b.nameEs, 'es')

export class DrizzleLicenseReader implements LicenseReader {
  constructor(private readonly executor: DbExecutor) {}

  async findById(id: string): Promise<LicenseView | null> {
    const [view] = await this.load(eq(licencia.id, id))
    return view ?? null
  }

  findByPerson(personalId: string): Promise<LicenseView[]> {
    return this.load(eq(licencia.personalId, personalId))
  }

  async list(query: LicenseListQuery): Promise<Paginated<LicenseListItemView>> {
    const { q, number, personalId, licenseTypeId, expiryFrom, expiryTo, page, pageSize } = query
    const p = personalAeronautico
    const filters: Array<SQL | undefined> = [
      personalId ? eq(licencia.personalId, personalId) : undefined,
      licenseTypeId ? eq(licencia.licenseTypeId, licenseTypeId) : undefined,
      number ? ilike(licencia.number, `%${escapeLike(number)}%`) : undefined,
      expiryFrom ? gte(licencia.expiryDate, expiryFrom) : undefined,
      expiryTo ? lte(licencia.expiryDate, expiryTo) : undefined,
    ]
    if (q) {
      const like = `%${escapeLike(q)}%`
      filters.push(
        or(
          ilike(sql`${p.firstNames} || ' ' || ${p.lastNames}`, like),
          ilike(sql`${p.lastNames} || ' ' || ${p.firstNames}`, like),
          ilike(p.cedula, `${escapeLike(q)}%`),
        ),
      )
    }
    const where = and(...filters)
    const [rows, [totals]] = await Promise.all([
      this.executor
        .select({
          id: licencia.id,
          personalId: licencia.personalId,
          cedula: p.cedula,
          firstNames: p.firstNames,
          lastNames: p.lastNames,
          typeId: catalogLicenseType.id,
          typeNameEs: catalogLicenseType.nameEs,
          typeNameEn: catalogLicenseType.nameEn,
          rav60Category: catalogLicenseType.rav60Category,
          number: licencia.number,
          issueDate: licencia.issueDate,
          expiryDate: licencia.expiryDate,
        })
        .from(licencia)
        .innerJoin(p, eq(p.id, licencia.personalId))
        .innerJoin(catalogLicenseType, eq(catalogLicenseType.id, licencia.licenseTypeId))
        .where(where)
        .orderBy(sql`${licencia.expiryDate} asc nulls last`, asc(p.lastNames), asc(p.firstNames), asc(licencia.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.executor.select({ total: count() }).from(licencia).innerJoin(p, eq(p.id, licencia.personalId)).where(where),
    ])
    return {
      items: rows.map((r) => ({
        id: r.id,
        personalId: r.personalId,
        person: { cedula: r.cedula, firstNames: r.firstNames, lastNames: r.lastNames },
        licenseType: { id: r.typeId, nameEs: r.typeNameEs, nameEn: r.typeNameEn, rav60Category: r.rav60Category },
        number: r.number,
        issueDate: r.issueDate,
        expiryDate: r.expiryDate,
      })),
      page,
      pageSize,
      total: totals?.total ?? 0,
    }
  }

  async history(licenseId: string): Promise<LicenseHistoryEntryDto[]> {
    const ofLicense = sql`(${auditoria.changes} -> 'after' ->> 'licenseId' = ${licenseId}
      or ${auditoria.changes} -> 'before' ->> 'licenseId' = ${licenseId})`
    const rows = await this.executor
      .select({
        id: auditoria.id,
        occurredAt: auditoria.occurredAt,
        action: auditoria.action,
        entity: auditoria.entity,
        entityId: auditoria.entityId,
        actorName: usuario.fullName,
      })
      .from(auditoria)
      .leftJoin(usuario, eq(usuario.id, auditoria.actorId))
      .where(
        or(
          and(eq(auditoria.entity, LICENSE_ENTITY), eq(auditoria.entityId, licenseId)),
          and(inArray(auditoria.entity, [TYPE_RATING_ENTITY, CLASS_RATING_ENTITY]), ofLicense),
        ),
      )
      .orderBy(desc(auditoria.occurredAt), desc(auditoria.id))
    return rows.map((r) => ({
      ...r,
      occurredAt: r.occurredAt.toISOString(),
      entity: r.entity as LicenseHistoryEntryDto['entity'],
    }))
  }

  /** Licenses matching `where`, with type, observations and both kinds of ratings (D20). */
  private async load(where: SQL): Promise<LicenseView[]> {
    const licenses = await this.executor
      .select({
        id: licencia.id,
        personalId: licencia.personalId,
        number: licencia.number,
        issueDate: licencia.issueDate,
        expiryDate: licencia.expiryDate,
        createdAt: licencia.createdAt,
        updatedAt: licencia.updatedAt,
        type: {
          ...ref(catalogLicenseType),
          rav60Category: catalogLicenseType.rav60Category,
          requiredMedicalClass: catalogLicenseType.requiredMedicalClass,
          appliesExpiry: catalogLicenseType.appliesExpiry,
        },
      })
      .from(licencia)
      .innerJoin(catalogLicenseType, eq(catalogLicenseType.id, licencia.licenseTypeId))
      .where(where)
      .orderBy(desc(licencia.issueDate), asc(licencia.id))
    if (licenses.length === 0) return []
    const ids = licenses.map((l) => l.id)

    const [observations, typeRatings, classRatings] = await Promise.all([
      this.executor
        .select({ licenseId: licenciaObservacion.licenciaId, ...ref(catalogLicenseObservation) })
        .from(licenciaObservacion)
        .innerJoin(catalogLicenseObservation, eq(catalogLicenseObservation.id, licenciaObservacion.observationId))
        .where(inArray(licenciaObservacion.licenciaId, ids)),
      this.executor
        .select({
          id: habilitacionTipo.id,
          licenseId: habilitacionTipo.licenciaId,
          expiryDate: habilitacionTipo.expiryDate,
          typeRating: ref(catalogTypeRating),
          function: ref(catalogFunction),
        })
        .from(habilitacionTipo)
        .innerJoin(catalogTypeRating, eq(catalogTypeRating.id, habilitacionTipo.typeRatingId))
        .innerJoin(catalogFunction, eq(catalogFunction.id, habilitacionTipo.functionId))
        .where(inArray(habilitacionTipo.licenciaId, ids))
        .orderBy(asc(habilitacionTipo.expiryDate), asc(catalogTypeRating.nameEs), asc(habilitacionTipo.id)),
      this.executor
        .select({
          id: habilitacionClase.id,
          licenseId: habilitacionClase.licenciaId,
          expiryDate: habilitacionClase.expiryDate,
          classRating: ref(catalogClassRating),
        })
        .from(habilitacionClase)
        .innerJoin(catalogClassRating, eq(catalogClassRating.id, habilitacionClase.classRatingId))
        .where(inArray(habilitacionClase.licenciaId, ids))
        .orderBy(asc(habilitacionClase.expiryDate), asc(catalogClassRating.nameEs), asc(habilitacionClase.id)),
    ])
    const aircraft =
      classRatings.length === 0
        ? []
        : await this.executor
            .select({ ratingId: habilitacionClaseAeronave.habilitacionClaseId, ...ref(catalogAircraft) })
            .from(habilitacionClaseAeronave)
            .innerJoin(catalogAircraft, eq(catalogAircraft.id, habilitacionClaseAeronave.aircraftId))
            .where(
              inArray(
                habilitacionClaseAeronave.habilitacionClaseId,
                classRatings.map((r) => r.id),
              ),
            )

    const observationsBy = groupBy(observations, (o) => o.licenseId)
    const typeRatingsBy = groupBy(typeRatings, (r) => r.licenseId)
    const classRatingsBy = groupBy(classRatings, (r) => r.licenseId)
    const aircraftBy = groupBy(aircraft, (a) => a.ratingId)
    const toRef = ({ id, nameEs, nameEn }: CatalogRef): CatalogRef => ({ id, nameEs, nameEn })

    return licenses.map(({ type, createdAt, updatedAt, ...license }) => ({
      ...license,
      licenseType: type,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      observations: (observationsBy.get(license.id) ?? []).map(toRef).sort(byName),
      typeRatings: typeRatingsBy.get(license.id) ?? [],
      classRatings: (classRatingsBy.get(license.id) ?? []).map((rating) => ({
        ...rating,
        aircraft: (aircraftBy.get(rating.id) ?? []).map(toRef).sort(byName),
      })),
    }))
  }
}
