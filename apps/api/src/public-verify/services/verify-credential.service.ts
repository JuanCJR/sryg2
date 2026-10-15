import { deriveCredentialStatus, type PublicVerification } from '@sryg/types'
import type { Clock } from '../../common/clock'
import type { ActiveBlocksRepository } from '../../common/credentials/repositories/active-blocks.repository'
import type { ValidityParametersRepository } from '../../common/credentials/repositories/validity-parameters.repository'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { VerificationRepository } from '../repositories/verification.repository'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * OUT-04: what anyone scanning the QR may see (D9): the kind, the number, the status and the
 * expiry, nothing else. A credential near expiry is still `vigente` to the public; an active block
 * wins over any date (D17). Unknown and malformed tokens look the same: 404.
 */
export class VerifyCredentialService {
  constructor(
    private readonly reader: VerificationRepository,
    private readonly blocks: ActiveBlocksRepository,
    private readonly validity: ValidityParametersRepository,
    private readonly clock: Clock,
  ) {}

  async execute(token: string): Promise<PublicVerification> {
    const credential = UUID.test(token) ? await this.reader.findByToken(token.toLowerCase()) : null
    if (!credential) throw new NotFoundError('Credencial no encontrada')
    const [blocked, threshold] = await Promise.all([
      this.blocks.hasActiveBlock(credential.personalId),
      this.validity.alertThresholdDays(),
    ])
    const status = deriveCredentialStatus(credential.expiryDate, this.clock.today(), threshold.value, blocked)
    return {
      kind: credential.kind,
      number: credential.number,
      status: status === 'proxima_a_vencer' ? 'vigente' : status,
      expiryDate: credential.expiryDate,
    }
  }
}
