import type { PublicVerification } from '@sryg/types'

/** The credential behind a QR token, with what deriving its status needs (never shown). */
export interface VerifiableCredential {
  kind: PublicVerification['kind']
  number: string
  expiryDate: string | null
  personalId: string
}

/** Looks a QR token up among licenses and medical certificates (D9). */
export interface VerificationReader {
  findByToken(token: string): Promise<VerifiableCredential | null>
}
