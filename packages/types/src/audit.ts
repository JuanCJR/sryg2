import { z } from 'zod'
import { AUDIT_ACTIONS } from './enums'

// Contracts of the audit viewer (W1-7).
export const auditActionSchema = z.enum(AUDIT_ACTIONS)
