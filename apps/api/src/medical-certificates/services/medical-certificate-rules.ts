import { deriveCredentialStatus, type MedicalCertificateDto } from '@sryg/types'
import type { ActiveBlocksRepository } from '../../common/credentials/repositories/active-blocks.repository'
import { ConflictError } from '../../common/errors/domain-errors'
import type { MedicalObservationCatalog } from '../repositories/medical-certificate.repository'
import { InvalidObservationError, type MedicalCertificate } from './medical-certificate'

export const BLOCKED_MESSAGE =
  'La persona tiene un bloqueo activo: no se puede registrar ni renovar el certificado médico hasta que se resuelva.'

/** BR-07: no registration or renewal while the holder has an unresolved block. */
export async function assertNoActiveBlock(blocks: ActiveBlocksRepository, personalId: string) {
  if (await blocks.hasActiveBlock(personalId)) throw new ConflictError(BLOCKED_MESSAGE)
}

/**
 * Every id must be in the catalog. New links must be active items; an inactive item already on the
 * certificate may stay (catalog items in use are deactivated, never deleted: D19).
 */
export async function assertObservations(
  catalog: MedicalObservationCatalog,
  ids: readonly string[],
  alreadyLinked: readonly string[] = [],
) {
  if (ids.length === 0) return
  const found = new Map((await catalog.findByIds(ids)).map((o) => [o.id, o.active]))
  for (const id of ids) {
    const active = found.get(id)
    if (active === undefined) throw new InvalidObservationError(`Unknown medical observation ${id}`)
    if (!active && !alreadyLinked.includes(id)) throw new InvalidObservationError(`Inactive medical observation ${id}`)
  }
}

/** The response shape, with the status derived on the spot (D17, BR-12). */
export function present(
  certificate: MedicalCertificate,
  today: string,
  thresholdDays: number,
  hasActiveBlock: boolean,
): MedicalCertificateDto {
  return {
    id: certificate.id,
    personalId: certificate.personalId,
    rav67Class: certificate.rav67Class,
    number: certificate.number,
    issueDate: certificate.issueDate,
    expiryDate: certificate.expiryDate,
    restrictions: certificate.restrictions,
    observations: certificate.observations,
    status: deriveCredentialStatus(certificate.expiryDate, today, thresholdDays, hasActiveBlock),
    createdAt: certificate.createdAt.toISOString(),
    updatedAt: certificate.updatedAt.toISOString(),
  }
}
