import { certificadoMedico, type DbExecutor, licencia } from '@sryg/db'
import { eq } from 'drizzle-orm'
import type { VerifiableCredential, VerificationReader } from '../domain/verification-reader'

export class DrizzleVerificationReader implements VerificationReader {
  constructor(private readonly executor: DbExecutor) {}

  async findByToken(token: string): Promise<VerifiableCredential | null> {
    const [license] = await this.executor
      .select({ number: licencia.number, expiryDate: licencia.expiryDate, personalId: licencia.personalId })
      .from(licencia)
      .where(eq(licencia.verificationToken, token))
      .limit(1)
    if (license) return { kind: 'licencia', ...license }
    const [certificate] = await this.executor
      .select({
        number: certificadoMedico.number,
        expiryDate: certificadoMedico.expiryDate,
        personalId: certificadoMedico.personalId,
      })
      .from(certificadoMedico)
      .where(eq(certificadoMedico.verificationToken, token))
      .limit(1)
    return certificate ? { kind: 'certificado_medico', ...certificate } : null
  }
}
