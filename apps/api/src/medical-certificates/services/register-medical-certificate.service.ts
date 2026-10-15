import { medicalExpiryDate, type MedicalCertificateDto, type RegisterMedicalCertificateInput } from '@sryg/types'
import type { Clock } from '../../common/clock'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { MedicalCertificatesTransaction } from '../medical-certificates.types'
import { type Actor, auditSnapshot, MEDICAL_CERTIFICATE_ENTITY } from './medical-certificate'
import { assertNoActiveBlock, assertObservations, present } from './medical-certificate-rules'

/** MED-01/MED-06: registers a certificate after the block check, with its emitir audit row. */
export class RegisterMedicalCertificateService {
  constructor(
    private readonly transaction: MedicalCertificatesTransaction,
    private readonly clock: Clock,
  ) {}

  execute(actor: Actor, personalId: string, input: RegisterMedicalCertificateInput): Promise<MedicalCertificateDto> {
    return this.transaction.run(async ({ certificates, observations, holders, blocks, validity, audit }) => {
      const documentNumber = await holders.documentNumber(personalId)
      if (documentNumber === null) throw new NotFoundError('Personnel not found')
      await assertNoActiveBlock(blocks, personalId)
      await assertObservations(observations, input.observationIds)

      const months = await validity.medicalValidityMonths(input.rav67Class)
      const data = {
        personalId,
        rav67Class: input.rav67Class,
        number: input.number ?? documentNumber,
        issueDate: input.issueDate,
        expiryDate: medicalExpiryDate(input.issueDate, months.value),
        restrictions: input.restrictions ?? null,
        observationIds: input.observationIds,
      }
      const created = await certificates.create(data)
      await audit.record({
        actorId: actor.id,
        action: 'emitir',
        entity: MEDICAL_CERTIFICATE_ENTITY,
        entityId: created.id,
        changes: { after: { personalId, ...auditSnapshot(data) } },
      })
      const threshold = await validity.alertThresholdDays()
      return present(created, this.clock.today(), threshold.value, false)
    })
  }
}
