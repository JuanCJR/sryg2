import type {
  AnyCatalogItemCreateInput,
  AnyCatalogItemDto,
  AnyCatalogItemUpdateInput,
  Rav60Category,
  Rav67Class,
} from '@sryg/types'

/** What the form edits, as typed: the container turns it into the API body. */
export interface CatalogItemFormValues {
  nameEs: string
  nameEn: string
  rav60Category: Rav60Category | ''
  requiredMedicalClass: Rav67Class | ''
  appliesExpiry: boolean
  /** Whole months, as typed; blank = no validity. */
  validityMonths: string
}

export const EMPTY_FORM: CatalogItemFormValues = {
  nameEs: '',
  nameEn: '',
  rav60Category: '',
  requiredMedicalClass: '',
  appliesExpiry: true,
  validityMonths: '',
}

export function toFormValues(item: AnyCatalogItemDto): CatalogItemFormValues {
  return {
    nameEs: item.nameEs,
    nameEn: item.nameEn ?? '',
    rav60Category: item.rav60Category ?? '',
    requiredMedicalClass: item.requiredMedicalClass ?? '',
    appliesExpiry: item.appliesExpiry ?? EMPTY_FORM.appliesExpiry,
    validityMonths: item.validityMonths == null ? '' : String(item.validityMonths),
  }
}

const months = (value: string) => (value.trim() ? Number(value.trim()) : null)

/** Body of POST; the form already validated it. */
export function toCreateBody(values: CatalogItemFormValues, licenseType: boolean): AnyCatalogItemCreateInput {
  const body: AnyCatalogItemCreateInput = { nameEs: values.nameEs.trim(), nameEn: values.nameEn.trim() || null }
  if (!licenseType) return body
  return {
    ...body,
    rav60Category: values.rav60Category || undefined,
    requiredMedicalClass: values.requiredMedicalClass || null,
    appliesExpiry: values.appliesExpiry,
    validityMonths: months(values.validityMonths),
  }
}

/**
 * Body of PATCH: only what changed. A placeholder validity (D3) is always sent, so that saving the
 * form confirms it even when the Admin keeps the value.
 */
export function toUpdateBody(
  item: AnyCatalogItemDto,
  values: CatalogItemFormValues,
  licenseType: boolean,
): AnyCatalogItemUpdateInput {
  const next = toCreateBody(values, licenseType) as Record<string, unknown>
  const current = toCreateBody(toFormValues(item), licenseType) as Record<string, unknown>
  const body: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(next)) if (value !== current[key]) body[key] = value
  if (licenseType && item.validityIsPlaceholder) body.validityMonths = next.validityMonths
  return body as AnyCatalogItemUpdateInput
}
