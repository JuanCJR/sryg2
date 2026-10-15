import type { BloodType, Rav67Class } from '@sryg/types'

/** A PNG or JPEG stored in Postgres (D5, D18). */
export interface CardImage {
  data: Buffer
  mime: string
}

/** A catalog text in Spanish plus its English translation for the bilingual card (D19). */
export interface Bilingual {
  es: string
  en: string | null
}

export interface CardHolder {
  firstNames: string
  lastNames: string
  address: string | null
  nationality: Bilingual | null
  birthDate: string | null
  bloodType: BloodType | null
  photo: CardImage | null
  signature: CardImage | null
}

interface CardBase {
  id: string
  personalId: string
  /** D22: by default the holder's document number. */
  number: string
  issueDate: string
  /** Opaque token behind the QR (D9). */
  verificationToken: string
  holder: CardHolder
}

/** Everything the license card prints (D7, D20, §4 of the parallel plan). */
export interface LicenseCard extends CardBase {
  kind: 'license'
  /** Null when the license type does not apply expiry (D20). */
  expiryDate: string | null
  licenseType: Bilingual
  typeRatings: Array<{ aircraft: Bilingual; function: Bilingual; expiryDate: string }>
  classRatings: Array<{ classRating: Bilingual; aircraft: Bilingual[]; expiryDate: string }>
  observations: Bilingual[]
}

/** Everything the medical certificate card prints (D7, D8): no clinical data (BR-05). */
export interface MedicalCard extends CardBase {
  kind: 'medical'
  expiryDate: string
  rav67Class: Rav67Class
  restrictions: string | null
  observations: Bilingual[]
  /** D13: the license types whose required medical class is this certificate's class. */
  validForLicenseTypes: Bilingual[]
}

export type CredentialCard = LicenseCard | MedicalCard
export type CredentialCardKind = CredentialCard['kind']

/** INAC logo and the President's signature (D18); null while the Admin has not uploaded them. */
export interface CardResources {
  logoInac: CardImage | null
  presidentSignature: CardImage | null
}

export interface CardRenderContext {
  resources: CardResources
  /** What the QR encodes: the public `/verificar/:token` page (D9). */
  verificationUrl: string
}
