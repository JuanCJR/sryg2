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
