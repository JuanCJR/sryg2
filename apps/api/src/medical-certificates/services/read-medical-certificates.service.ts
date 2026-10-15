import {
  type MedicalCertificateDto,
  type MedicalCertificateHistoryEntryDto,
  type MedicalValidityDto,
  type PersonMedicalCertificatesDto,
  RAV67_CLASSES,
} from '@sryg/types'
import type { Clock } from '../../common/clock'
import type { ActiveBlocksRepository } from '../../common/credentials/repositories/active-blocks.repository'
import type { ValidityParametersRepository } from '../../common/credentials/repositories/validity-parameters.repository'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { MedicalCertificateHistoryRepository } from '../repositories/medical-certificate-history.repository'
import type { HolderLookup, MedicalCertificateRepository } from '../repositories/medical-certificate.repository'
import { present } from './medical-certificate-rules'

export interface MedicalCertificateReaders {
  certificates: MedicalCertificateRepository
  holders: HolderLookup
  blocks: ActiveBlocksRepository
  validity: ValidityParametersRepository
  clock: Clock
}

/** MED-07: the holder's certificates with derived statuses, the block flag and the threshold. */
export class ListPersonMedicalCertificatesService {
  constructor(private readonly readers: MedicalCertificateReaders) {}

  async execute(personalId: string): Promise<PersonMedicalCertificatesDto> {
    const { certificates, holders, blocks, validity, clock } = this.readers
    if ((await holders.documentNumber(personalId)) === null) throw new NotFoundError('Personnel not found')
    const [items, hasActiveBlock, threshold] = await Promise.all([
      certificates.listByPerson(personalId),
      blocks.hasActiveBlock(personalId),
      validity.alertThresholdDays(),
    ])
    const today = clock.today()
    return {
      personalId,
      hasActiveBlock,
      alertThresholdDays: threshold,
      items: items.map((c) => present(c, today, threshold.value, hasActiveBlock)),
    }
  }
}

export class GetMedicalCertificateService {
  constructor(private readonly readers: MedicalCertificateReaders) {}

  async execute(id: string): Promise<MedicalCertificateDto> {
    const { certificates, blocks, validity, clock } = this.readers
    const found = await certificates.findById(id)
    if (!found) throw new NotFoundError('Medical certificate not found')
    const [hasActiveBlock, threshold] = await Promise.all([
      blocks.hasActiveBlock(found.personalId),
      validity.alertThresholdDays(),
    ])
    return present(found, clock.today(), threshold.value, hasActiveBlock)
  }
}

/** D3: the validity of each RAV 67 class, so the form can preview the expiry it will get. */
export class GetMedicalValidityService {
  constructor(private readonly validity: ValidityParametersRepository) {}

  async execute(): Promise<MedicalValidityDto> {
    const values = await Promise.all(RAV67_CLASSES.map((c) => this.validity.medicalValidityMonths(c)))
    return Object.fromEntries(RAV67_CLASSES.map((c, i) => [c, values[i]])) as MedicalValidityDto
  }
}

export class GetMedicalCertificateHistoryService {
  constructor(
    private readonly certificates: MedicalCertificateRepository,
    private readonly history: MedicalCertificateHistoryRepository,
  ) {}

  async execute(id: string): Promise<MedicalCertificateHistoryEntryDto[]> {
    if (!(await this.certificates.findById(id))) throw new NotFoundError('Medical certificate not found')
    return (await this.history.history(id)).map((entry) => ({ ...entry, occurredAt: entry.occurredAt.toISOString() }))
  }
}
