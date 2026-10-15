import { auditoria, type DbExecutor, usuario } from '@sryg/db'
import { and, desc, eq } from 'drizzle-orm'
import type { MedicalCertificateHistoryEntry } from '../dtos/medical-certificate-history.dto'
import { MEDICAL_CERTIFICATE_ENTITY } from '../services/medical-certificate'

/** Reads the audit trail of one certificate (MED-07), newest first. */
export class MedicalCertificateHistoryRepository {
  constructor(private readonly executor: DbExecutor) {}

  async history(certificateId: string): Promise<MedicalCertificateHistoryEntry[]> {
    const rows = await this.executor
      .select({
        id: auditoria.id,
        action: auditoria.action,
        occurredAt: auditoria.occurredAt,
        actorId: usuario.id,
        actorName: usuario.fullName,
        changes: auditoria.changes,
      })
      .from(auditoria)
      .leftJoin(usuario, eq(usuario.id, auditoria.actorId))
      .where(and(eq(auditoria.entity, MEDICAL_CERTIFICATE_ENTITY), eq(auditoria.entityId, certificateId)))
      .orderBy(desc(auditoria.occurredAt), desc(auditoria.id))
    return rows.map(({ actorId, actorName, ...row }) => ({
      ...row,
      actor: actorId && actorName !== null ? { id: actorId, fullName: actorName } : null,
    }))
  }
}
