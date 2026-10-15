import { catalogLicenseType, type DbExecutor, parametroSistema } from '@sryg/db'
import { ALERT_THRESHOLD_KEY, MEDICAL_VALIDITY_KEYS, type Rav67Class } from '@sryg/types'
import { eq } from 'drizzle-orm'
import { DomainError } from '../../errors/domain-errors'
import type { LicenseTypeValidity, ParameterValue } from '../dtos/validity-parameters.dto'

/** A required parameter row is absent: a deployment problem, never replaced by a default. */
export class MissingParameterError extends DomainError {}

/**
 * Reads the parameters that drive expiry and alerts. Numbers are never hardcoded (BR-02): they come
 * from `parametro_sistema` (threshold, RAV 67 validity) and from the license type catalog.
 */
export class ValidityParametersRepository {
  /** `keys` exists for tests that need a parameter that is absent. */
  constructor(
    private readonly executor: DbExecutor,
    private readonly keys: { alertThresholdKey: string } = { alertThresholdKey: ALERT_THRESHOLD_KEY },
  ) {}

  alertThresholdDays(): Promise<ParameterValue<number>> {
    return this.readNumber(this.keys.alertThresholdKey)
  }

  medicalValidityMonths(rav67Class: Rav67Class): Promise<ParameterValue<number>> {
    return this.readNumber(MEDICAL_VALIDITY_KEYS[rav67Class])
  }

  /** Null when the license type does not exist. */
  async licenseTypeValidity(licenseTypeId: string): Promise<LicenseTypeValidity | null> {
    const [row] = await this.executor
      .select({
        appliesExpiry: catalogLicenseType.appliesExpiry,
        validityMonths: catalogLicenseType.validityMonths,
        isPlaceholder: catalogLicenseType.validityIsPlaceholder,
      })
      .from(catalogLicenseType)
      .where(eq(catalogLicenseType.id, licenseTypeId))
      .limit(1)
    return row ?? null
  }

  private async readNumber(key: string): Promise<ParameterValue<number>> {
    const [row] = await this.executor
      .select({ value: parametroSistema.value, isPlaceholder: parametroSistema.isPlaceholder })
      .from(parametroSistema)
      .where(eq(parametroSistema.key, key))
      .limit(1)
    if (!row || typeof row.value !== 'number') throw new MissingParameterError(`Parameter ${key} is not configured`)
    return { value: row.value, isPlaceholder: row.isPlaceholder }
  }
}
