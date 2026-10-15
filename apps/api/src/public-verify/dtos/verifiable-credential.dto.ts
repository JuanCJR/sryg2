import type { PublicVerification } from '@sryg/types'

/** The credential behind a QR token, with what deriving its status needs (never shown). */
export interface VerifiableCredential {
  kind: PublicVerification['kind']
  number: string
  expiryDate: string | null
  personalId: string
}
