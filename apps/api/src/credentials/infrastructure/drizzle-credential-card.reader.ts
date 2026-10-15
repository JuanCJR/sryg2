import {
  catalogAircraft,
  catalogClassRating,
  catalogFunction,
  catalogLicenseObservation,
  catalogLicenseType,
  catalogMedicalObservation,
  catalogNationality,
  catalogTypeRating,
  certificadoMedico,
  certificadoObservacion,
  type DbExecutor,
  habilitacionClase,
  habilitacionClaseAeronave,
  habilitacionTipo,
  licencia,
  licenciaObservacion,
  personalAeronautico,
} from '@sryg/db'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type {
  Bilingual,
  CardHolder,
  CardImage,
  CredentialCardReader,
  LicenseCard,
  MedicalCard,
} from '../domain/credential-card'

const p = personalAeronautico
const holderFields = {
  firstNames: p.firstNames,
  lastNames: p.lastNames,
  address: p.address,
  birthDate: p.birthDate,
  bloodType: p.bloodType,
  photo: p.photo,
  photoMime: p.photoMime,
  signature: p.signature,
  signatureMime: p.signatureMime,
  nationalityEs: catalogNationality.nameEs,
  nationalityEn: catalogNationality.nameEn,
}

type HolderRow = {
  firstNames: string
  lastNames: string
  address: string | null
  birthDate: string | null
  bloodType: CardHolder['bloodType']
  photo: Buffer | null
  photoMime: string | null
  signature: Buffer | null
  signatureMime: string | null
  nationalityEs: string | null
  nationalityEn: string | null
}

const imageOf = (data: Buffer | null, mime: string | null): CardImage | null => (data && mime ? { data, mime } : null)
const text = (es: string, en: string | null): Bilingual => ({ es, en })

function holderOf(row: HolderRow): CardHolder {
  return {
    firstNames: row.firstNames,
    lastNames: row.lastNames,
    address: row.address,
    birthDate: row.birthDate,
    bloodType: row.bloodType,
    nationality: row.nationalityEs === null ? null : text(row.nationalityEs, row.nationalityEn),
    photo: imageOf(row.photo, row.photoMime),
    signature: imageOf(row.signature, row.signatureMime),
  }
}

/** Reads a card's data in one go: the credential, its holder and the catalog texts (D19). */
export class DrizzleCredentialCardReader implements CredentialCardReader {
  constructor(private readonly executor: DbExecutor) {}

  async license(id: string): Promise<LicenseCard | null> {
    const [row] = await this.executor
      .select({
        id: licencia.id,
        personalId: licencia.personalId,
        number: licencia.number,
        issueDate: licencia.issueDate,
        expiryDate: licencia.expiryDate,
        verificationToken: licencia.verificationToken,
        typeEs: catalogLicenseType.nameEs,
        typeEn: catalogLicenseType.nameEn,
        ...holderFields,
      })
      .from(licencia)
      .innerJoin(catalogLicenseType, eq(catalogLicenseType.id, licencia.licenseTypeId))
      .innerJoin(p, eq(p.id, licencia.personalId))
      .leftJoin(catalogNationality, eq(catalogNationality.id, p.nationalityId))
      .where(eq(licencia.id, id))
      .limit(1)
    if (!row) return null

    const typeRatings = await this.executor
      .select({
        aircraftEs: catalogTypeRating.nameEs,
        aircraftEn: catalogTypeRating.nameEn,
        functionEs: catalogFunction.nameEs,
        functionEn: catalogFunction.nameEn,
        expiryDate: habilitacionTipo.expiryDate,
      })
      .from(habilitacionTipo)
      .innerJoin(catalogTypeRating, eq(catalogTypeRating.id, habilitacionTipo.typeRatingId))
      .innerJoin(catalogFunction, eq(catalogFunction.id, habilitacionTipo.functionId))
      .where(eq(habilitacionTipo.licenciaId, id))
      .orderBy(asc(catalogTypeRating.nameEs), asc(habilitacionTipo.expiryDate))

    const classRows = await this.executor
      .select({
        id: habilitacionClase.id,
        classEs: catalogClassRating.nameEs,
        classEn: catalogClassRating.nameEn,
        expiryDate: habilitacionClase.expiryDate,
      })
      .from(habilitacionClase)
      .innerJoin(catalogClassRating, eq(catalogClassRating.id, habilitacionClase.classRatingId))
      .where(eq(habilitacionClase.licenciaId, id))
      .orderBy(asc(catalogClassRating.nameEs), asc(habilitacionClase.expiryDate))
    const aircraftRows = classRows.length
      ? await this.executor
          .select({
            classId: habilitacionClaseAeronave.habilitacionClaseId,
            es: catalogAircraft.nameEs,
            en: catalogAircraft.nameEn,
          })
          .from(habilitacionClaseAeronave)
          .innerJoin(catalogAircraft, eq(catalogAircraft.id, habilitacionClaseAeronave.aircraftId))
          .where(
            inArray(
              habilitacionClaseAeronave.habilitacionClaseId,
              classRows.map((c) => c.id),
            ),
          )
          .orderBy(asc(catalogAircraft.nameEs))
      : []

    const observations = await this.executor
      .select({ es: catalogLicenseObservation.nameEs, en: catalogLicenseObservation.nameEn })
      .from(licenciaObservacion)
      .innerJoin(catalogLicenseObservation, eq(catalogLicenseObservation.id, licenciaObservacion.observationId))
      .where(eq(licenciaObservacion.licenciaId, id))
      .orderBy(asc(catalogLicenseObservation.nameEs))

    return {
      kind: 'license',
      id: row.id,
      personalId: row.personalId,
      number: row.number,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      verificationToken: row.verificationToken,
      licenseType: text(row.typeEs, row.typeEn),
      holder: holderOf(row),
      typeRatings: typeRatings.map((r) => ({
        aircraft: text(r.aircraftEs, r.aircraftEn),
        function: text(r.functionEs, r.functionEn),
        expiryDate: r.expiryDate,
      })),
      classRatings: classRows.map((c) => ({
        classRating: text(c.classEs, c.classEn),
        aircraft: aircraftRows.filter((a) => a.classId === c.id).map((a) => text(a.es, a.en)),
        expiryDate: c.expiryDate,
      })),
      observations,
    }
  }

  async medical(id: string): Promise<MedicalCard | null> {
    const c = certificadoMedico
    const [row] = await this.executor
      .select({
        id: c.id,
        personalId: c.personalId,
        rav67Class: c.rav67Class,
        number: c.number,
        issueDate: c.issueDate,
        expiryDate: c.expiryDate,
        restrictions: c.restrictions,
        verificationToken: c.verificationToken,
        ...holderFields,
      })
      .from(c)
      .innerJoin(p, eq(p.id, c.personalId))
      .leftJoin(catalogNationality, eq(catalogNationality.id, p.nationalityId))
      .where(eq(c.id, id))
      .limit(1)
    if (!row) return null

    const observations = await this.executor
      .select({ es: catalogMedicalObservation.nameEs, en: catalogMedicalObservation.nameEn })
      .from(certificadoObservacion)
      .innerJoin(catalogMedicalObservation, eq(catalogMedicalObservation.id, certificadoObservacion.observationId))
      .where(eq(certificadoObservacion.certificadoMedicoId, id))
      .orderBy(asc(catalogMedicalObservation.nameEs))

    // D13: the active license types whose required medical class is this certificate's.
    const validForLicenseTypes = await this.executor
      .select({ es: catalogLicenseType.nameEs, en: catalogLicenseType.nameEn })
      .from(catalogLicenseType)
      .where(and(eq(catalogLicenseType.requiredMedicalClass, row.rav67Class), eq(catalogLicenseType.active, true)))
      .orderBy(asc(catalogLicenseType.nameEs))

    return {
      kind: 'medical',
      id: row.id,
      personalId: row.personalId,
      rav67Class: row.rav67Class,
      number: row.number,
      issueDate: row.issueDate,
      expiryDate: row.expiryDate,
      restrictions: row.restrictions,
      verificationToken: row.verificationToken,
      holder: holderOf(row),
      observations,
      validForLicenseTypes,
    }
  }
}
