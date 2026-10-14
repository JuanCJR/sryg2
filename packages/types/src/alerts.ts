import { z } from 'zod'
import { ALERT_KINDS, CREDENTIAL_KINDS } from './enums'

// Contracts of the alerts module (W1-9).
export const alertKindSchema = z.enum(ALERT_KINDS)
export const credentialKindSchema = z.enum(CREDENTIAL_KINDS)
