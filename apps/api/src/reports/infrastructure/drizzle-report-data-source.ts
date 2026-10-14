import {
  bloqueo,
  catalogClassRating,
  catalogFunction,
  catalogLicenseType,
  catalogTypeRating,
  certificadoMedico,
  type DbExecutor,
  habilitacionClase,
  habilitacionTipo,
  licencia,
  personalAeronautico,
  usuario,
} from '@sryg/db'
import { and, eq, ilike, or, type SQL, sql } from 'drizzle-orm'
import type { ReportDataSource, ReportDataset } from '../domain/report-dataset'

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)
const p = personalAeronautico

/** Same search as the personnel list: name in either order, or the start of the document number. */
function personFilter(q: string | undefined): SQL | undefined {
  const term = q?.trim()
  if (!term) return undefined
  const like = `%${escapeLike(term)}%`
  return or(
    ilike(sql`${p.firstNames} || ' ' || ${p.lastNames}`, like),
    ilike(sql`${p.lastNames} || ' ' || ${p.firstNames}`, like),
    ilike(p.cedula, `${escapeLike(term)}%`),
  )
}

/** Reads through the pool; every query is restricted to the people matching the search. */
export class DrizzleReportDataSource implements ReportDataSource {
  constructor(private readonly executor: DbExecutor) {}

  async load({ q }: { q?: string }): Promise<ReportDataset> {
    const filter = personFilter(q)
    const db = this.executor
    const [people, licenses, typeRatings, classRatings, medical, activeBlocks] = await Promise.all([
      db.select({ id: p.id, cedula: p.cedula, firstNames: p.firstNames, lastNames: p.lastNames }).from(p).where(filter),
      db
        .select({
          id: licencia.id,
          personalId: licencia.personalId,
          licenseTypeId: licencia.licenseTypeId,
          licenseTypeName: catalogLicenseType.nameEs,
          rav60Category: catalogLicenseType.rav60Category,
          number: licencia.number,
          issueDate: licencia.issueDate,
          expiryDate: licencia.expiryDate,
          createdAt: licencia.createdAt,
        })
        .from(licencia)
        .innerJoin(p, eq(p.id, licencia.personalId))
        .innerJoin(catalogLicenseType, eq(catalogLicenseType.id, licencia.licenseTypeId))
        .where(filter),
      db
        .select({
          id: habilitacionTipo.id,
          licenciaId: habilitacionTipo.licenciaId,
          typeRatingId: habilitacionTipo.typeRatingId,
          typeRatingName: catalogTypeRating.nameEs,
          functionName: catalogFunction.nameEs,
          expiryDate: habilitacionTipo.expiryDate,
          createdAt: habilitacionTipo.createdAt,
        })
        .from(habilitacionTipo)
        .innerJoin(licencia, eq(licencia.id, habilitacionTipo.licenciaId))
        .innerJoin(p, eq(p.id, licencia.personalId))
        .innerJoin(catalogTypeRating, eq(catalogTypeRating.id, habilitacionTipo.typeRatingId))
        .innerJoin(catalogFunction, eq(catalogFunction.id, habilitacionTipo.functionId))
        .where(filter),
      db
        .select({
          id: habilitacionClase.id,
          licenciaId: habilitacionClase.licenciaId,
          classRatingId: habilitacionClase.classRatingId,
          classRatingName: catalogClassRating.nameEs,
          expiryDate: habilitacionClase.expiryDate,
          createdAt: habilitacionClase.createdAt,
        })
        .from(habilitacionClase)
        .innerJoin(licencia, eq(licencia.id, habilitacionClase.licenciaId))
        .innerJoin(p, eq(p.id, licencia.personalId))
        .innerJoin(catalogClassRating, eq(catalogClassRating.id, habilitacionClase.classRatingId))
        .where(filter),
      db
        .select({
          id: certificadoMedico.id,
          personalId: certificadoMedico.personalId,
          rav67Class: certificadoMedico.rav67Class,
          number: certificadoMedico.number,
          issueDate: certificadoMedico.issueDate,
          expiryDate: certificadoMedico.expiryDate,
          createdAt: certificadoMedico.createdAt,
        })
        .from(certificadoMedico)
        .innerJoin(p, eq(p.id, certificadoMedico.personalId))
        .where(filter),
      db
        .select({
          id: bloqueo.id,
          personalId: bloqueo.personalId,
          type: bloqueo.type,
          reason: bloqueo.reason,
          createdAt: bloqueo.createdAt,
          createdByName: usuario.fullName,
        })
        .from(bloqueo)
        .innerJoin(p, eq(p.id, bloqueo.personalId))
        .innerJoin(usuario, eq(usuario.id, bloqueo.createdBy))
        .where(and(eq(bloqueo.status, 'activo'), filter)),
    ])
    return { people, licenses, typeRatings, classRatings, medical, activeBlocks }
  }

  async licenseTypeName(id: string): Promise<string | null> {
    const [row] = await this.executor
      .select({ name: catalogLicenseType.nameEs })
      .from(catalogLicenseType)
      .where(eq(catalogLicenseType.id, id))
      .limit(1)
    return row?.name ?? null
  }
}
