import {
  catalogMedicalObservation,
  certificadoMedico,
  certificadoObservacion,
  type DbExecutor,
  personalAeronautico,
} from '@sryg/db'
import type { CatalogOption } from '@sryg/types'
import { asc, desc, eq, inArray } from 'drizzle-orm'
import { NotFoundError } from '../../common/errors/domain-errors'
import type {
  MedicalCertificate,
  MedicalCertificateRenewal,
  NewMedicalCertificate,
} from '../services/medical-certificate'

const c = certificadoMedico
// The administrative fields only (BR-05); the stored status and the QR token stay out of the domain.
const certificateFields = {
  id: c.id,
  personalId: c.personalId,
  rav67Class: c.rav67Class,
  number: c.number,
  issueDate: c.issueDate,
  expiryDate: c.expiryDate,
  restrictions: c.restrictions,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
}

/** Works against the pool or a transaction handle; the transaction runner builds one per transaction. */
export class MedicalCertificateRepository {
  constructor(private readonly executor: DbExecutor) {}

  async findById(id: string): Promise<MedicalCertificate | null> {
    const rows = await this.executor.select(certificateFields).from(c).where(eq(c.id, id)).limit(1)
    return (await this.withObservations(rows))[0] ?? null
  }

  /** Newest issue date first. */
  async listByPerson(personalId: string): Promise<MedicalCertificate[]> {
    const rows = await this.executor
      .select(certificateFields)
      .from(c)
      .where(eq(c.personalId, personalId))
      .orderBy(desc(c.issueDate), desc(c.createdAt), asc(c.id))
    return this.withObservations(rows)
  }

  async create({ observationIds, ...data }: NewMedicalCertificate): Promise<MedicalCertificate> {
    const [row] = await this.executor.insert(c).values(data).returning({ id: c.id })
    await this.link(row!.id, observationIds)
    return (await this.findById(row!.id))!
  }

  /** Replaces the dates, number, restrictions and observations; throws NotFoundError for an unknown id. */
  async renew(id: string, { observationIds, ...data }: MedicalCertificateRenewal): Promise<MedicalCertificate> {
    const [row] = await this.executor.update(c).set(data).where(eq(c.id, id)).returning({ id: c.id })
    if (!row) throw new NotFoundError('Medical certificate not found')
    await this.executor.delete(certificadoObservacion).where(eq(certificadoObservacion.certificadoMedicoId, id))
    await this.link(id, observationIds)
    return (await this.findById(id))!
  }

  private async link(certificateId: string, observationIds: readonly string[]) {
    if (observationIds.length === 0) return
    await this.executor
      .insert(certificadoObservacion)
      .values(observationIds.map((observationId) => ({ certificadoMedicoId: certificateId, observationId })))
  }

  private async withObservations(rows: Array<Omit<MedicalCertificate, 'observations'>>) {
    if (rows.length === 0) return []
    const links = await this.executor
      .select({
        certificateId: certificadoObservacion.certificadoMedicoId,
        id: catalogMedicalObservation.id,
        nameEs: catalogMedicalObservation.nameEs,
        nameEn: catalogMedicalObservation.nameEn,
      })
      .from(certificadoObservacion)
      .innerJoin(catalogMedicalObservation, eq(catalogMedicalObservation.id, certificadoObservacion.observationId))
      .where(
        inArray(
          certificadoObservacion.certificadoMedicoId,
          rows.map((r) => r.id),
        ),
      )
      .orderBy(asc(catalogMedicalObservation.nameEs))
    const byCertificate = new Map<string, CatalogOption[]>()
    for (const { certificateId, ...option } of links) {
      byCertificate.set(certificateId, [...(byCertificate.get(certificateId) ?? []), option])
    }
    return rows.map((row) => ({ ...row, observations: byCertificate.get(row.id) ?? [] }))
  }
}

/** Medical observations of the D19 catalog. */
export class MedicalObservationCatalog {
  constructor(private readonly executor: DbExecutor) {}

  /** The existing items among `ids`, with whether each is active. */
  findByIds(ids: readonly string[]) {
    if (ids.length === 0) return Promise.resolve([])
    return this.executor
      .select({ id: catalogMedicalObservation.id, active: catalogMedicalObservation.active })
      .from(catalogMedicalObservation)
      .where(inArray(catalogMedicalObservation.id, [...ids]))
  }
}

/** What the module needs from the holder's record. */
export class HolderLookup {
  constructor(private readonly executor: DbExecutor) {}

  /** The holder's document number (D22), or null when the person does not exist. */
  async documentNumber(personalId: string): Promise<string | null> {
    const [row] = await this.executor
      .select({ cedula: personalAeronautico.cedula })
      .from(personalAeronautico)
      .where(eq(personalAeronautico.id, personalId))
      .limit(1)
    return row?.cedula ?? null
  }
}
