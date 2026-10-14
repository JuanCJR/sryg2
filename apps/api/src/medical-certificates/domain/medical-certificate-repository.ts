import type { MedicalCertificate, MedicalCertificateRenewal, NewMedicalCertificate } from './medical-certificate'

export interface MedicalCertificateRepository {
  findById(id: string): Promise<MedicalCertificate | null>
  /** Newest issue date first. */
  listByPerson(personalId: string): Promise<MedicalCertificate[]>
  create(data: NewMedicalCertificate): Promise<MedicalCertificate>
  /** Replaces the dates, number, restrictions and observations; throws NotFoundError for an unknown id. */
  renew(id: string, data: MedicalCertificateRenewal): Promise<MedicalCertificate>
}

/** Medical observations of the D19 catalog. */
export interface MedicalObservationCatalog {
  /** The existing items among `ids`, with whether each is active. */
  findByIds(ids: readonly string[]): Promise<Array<{ id: string; active: boolean }>>
}

/** What the module needs from the holder's record. */
export interface HolderLookup {
  /** The holder's document number (D22), or null when the person does not exist. */
  documentNumber(personalId: string): Promise<string | null>
}
