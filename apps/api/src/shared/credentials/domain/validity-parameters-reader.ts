import type { Rav67Class } from '@sryg/types'
import { DomainError } from '../../domain/errors'

/** A configurable value (D3) and whether it is still the `PENDIENTE INAC` placeholder. */
export interface ParameterValue<T> {
  value: T
  isPlaceholder: boolean
}

/** Validity of a license type of the catalog (D20). `validityMonths` is irrelevant when it does not expire. */
export interface LicenseTypeValidity {
  appliesExpiry: boolean
  validityMonths: number | null
  isPlaceholder: boolean
}

/**
 * Reads the parameters that drive expiry and alerts. Numbers are never hardcoded (BR-02): they come
 * from `parametro_sistema` (threshold, RAV 67 validity) and from the license type catalog.
 */
export interface ValidityParametersReader {
  alertThresholdDays(): Promise<ParameterValue<number>>
  medicalValidityMonths(rav67Class: Rav67Class): Promise<ParameterValue<number>>
  /** Null when the license type does not exist. */
  licenseTypeValidity(licenseTypeId: string): Promise<LicenseTypeValidity | null>
}

/** A required parameter row is absent: a deployment problem, never replaced by a default. */
export class MissingParameterError extends DomainError {}
