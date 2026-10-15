import type { AuditAction } from '@sryg/types'

export interface MedicalCertificateHistoryEntry {
  id: number
  action: AuditAction
  occurredAt: Date
  actor: { id: string; fullName: string } | null
  changes: { before?: unknown; after?: unknown } | null
}
