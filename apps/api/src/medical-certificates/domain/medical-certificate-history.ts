import type { AuditAction } from '@sryg/types'

export interface MedicalCertificateHistoryEntry {
  id: number
  action: AuditAction
  occurredAt: Date
  actor: { id: string; fullName: string } | null
  changes: { before?: unknown; after?: unknown } | null
}

/** Reads the audit trail of one certificate (MED-07), newest first. */
export interface MedicalCertificateHistoryReader {
  history(certificateId: string): Promise<MedicalCertificateHistoryEntry[]>
}
