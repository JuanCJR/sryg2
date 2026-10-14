import { catalogLicenseType, type DbExecutor, parametroSistema } from '@sryg/db'
import { ALERT_THRESHOLD_KEY, MEDICAL_VALIDITY_KEYS, type Rav67Class } from '@sryg/types'
import { eq } from 'drizzle-orm'
import {
  type LicenseTypeValidity,
  MissingParameterError,
  type ParameterValue,
  type ValidityParametersReader,
} from '../domain/validity-parameters-reader'

export class DrizzleValidityParametersReader implements ValidityParametersReader {
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
