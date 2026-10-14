import { medicalExpiryDate, type MedicalCertificateDto, type RenewMedicalCertificateInput } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import type { Clock } from '../domain/clock'
import { type Actor, auditSnapshot, MEDICAL_CERTIFICATE_ENTITY } from '../domain/medical-certificate'
import type { MedicalCertificatesUnitOfWork } from '../domain/medical-certificates-unit-of-work'
import { assertNoActiveBlock, assertObservations, present } from './medical-certificate-rules'

/** MED-01/MED-06: renews a certificate of the same class after the block check, with its renovar row. */
export class RenewMedicalCertificateUseCase {
  constructor(
    private readonly uow: MedicalCertificatesUnitOfWork,
    private readonly clock: Clock,
  ) {}

  execute(actor: Actor, id: string, input: RenewMedicalCertificateInput): Promise<MedicalCertificateDto> {
    return this.uow.run(async ({ certificates, observations, blocks, validity, audit }) => {
      const current = await certificates.findById(id)
      if (!current) throw new NotFoundError('Medical certificate not found')
      await assertNoActiveBlock(blocks, current.personalId)
      const linked = current.observations.map((o) => o.id)
      const observationIds = input.observationIds ?? linked
      await assertObservations(observations, observationIds, linked)

      const months = await validity.medicalValidityMonths(current.rav67Class)
      const renewal = {
        number: input.number ?? current.number,
        issueDate: input.issueDate,
        expiryDate: medicalExpiryDate(input.issueDate, months.value),
        restrictions: input.restrictions === undefined ? current.restrictions : input.restrictions,
        observationIds,
      }
      const renewed = await certificates.renew(id, renewal)
      await audit.record({
        actorId: actor.id,
        action: 'renovar',
        entity: MEDICAL_CERTIFICATE_ENTITY,
        entityId: id,
        changes: { before: auditSnapshot(current), after: auditSnapshot(renewed) },
      })
      const threshold = await validity.alertThresholdDays()
      return present(renewed, this.clock.today(), threshold.value, false)
    })
  }
}
