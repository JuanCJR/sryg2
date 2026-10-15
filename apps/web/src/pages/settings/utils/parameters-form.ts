import {
  GRAPHIC_RESOURCE_MAX_BYTES,
  GRAPHIC_RESOURCE_MIME_TYPES,
  type GraphicResourceKind,
  type MedicalValidityInput,
  RAV67_CLASSES,
  type Rav67Class,
  type SettingsParametersDto,
} from '@sryg/types'

export const MEDICAL_CLASS_LABELS: Record<Rav67Class, string> = {
  clase_1: 'Clase 1',
  clase_2: 'Clase 2',
  clase_3: 'Clase 3',
}

export const GRAPHIC_RESOURCE_LABELS: Record<GraphicResourceKind, string> = {
  logo_inac: 'Logo del INAC',
  firma_presidente: 'Firma del Presidente',
}

/** Field values as typed (strings), keyed by `threshold` and each RAV 67 class. */
export type ParameterField = 'threshold' | Rav67Class
export type ParameterValues = Record<ParameterField, string>

export const POSITIVE_WHOLE_ERROR = 'Ingrese un número entero mayor que cero.'

export function toFormValues(parameters: SettingsParametersDto): ParameterValues {
  return {
    threshold: String(parameters.alertThresholdDays.value),
    clase_1: String(parameters.medicalValidityMonths.clase_1.value),
    clase_2: String(parameters.medicalValidityMonths.clase_2.value),
    clase_3: String(parameters.medicalValidityMonths.clase_3.value),
  }
}

function parsePositiveWhole(raw: string): number | null {
  if (!/^\d+$/.test(raw.trim())) return null
  const value = Number(raw.trim())
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

export interface ParametersSavePlan {
  /** Only sections whose values changed or still hold a placeholder are sent (D3). */
  medicalValidity?: MedicalValidityInput
  alertThresholdDays?: number
}

export type ParametersValidation =
  { ok: true; plan: ParametersSavePlan } | { ok: false; errors: Partial<Record<ParameterField, string>> }

/**
 * Validates the typed values and decides what to send. Saving the page is the Admin saving the values
 * shown (D3): a section that still carries `PENDIENTE INAC` is sent even when unchanged, which clears
 * the mark; a section with real, unchanged values is not.
 */
export function planParametersSave(values: ParameterValues, loaded: SettingsParametersDto): ParametersValidation {
  const errors: Partial<Record<ParameterField, string>> = {}
  const parsed = {} as Record<ParameterField, number>
  for (const field of ['threshold', ...RAV67_CLASSES] as const) {
    const value = parsePositiveWhole(values[field])
    if (value === null) errors[field] = POSITIVE_WHOLE_ERROR
    else parsed[field] = value
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const plan: ParametersSavePlan = {}
  const medical = RAV67_CLASSES.map((c) => loaded.medicalValidityMonths[c])
  if (RAV67_CLASSES.some((c, i) => medical[i]!.isPlaceholder || medical[i]!.value !== parsed[c]))
    plan.medicalValidity = { clase_1: parsed.clase_1, clase_2: parsed.clase_2, clase_3: parsed.clase_3 }
  const threshold = loaded.alertThresholdDays
  if (threshold.isPlaceholder || threshold.value !== parsed.threshold) plan.alertThresholdDays = parsed.threshold
  return { ok: true, plan }
}

/** Client-side check of D18 (the API repeats it, signature included): PNG or JPEG of up to 500 KB. */
export function graphicFileError(file: File): string | null {
  if (!GRAPHIC_RESOURCE_MIME_TYPES.some((mime) => mime === file.type)) return 'Use una imagen PNG o JPEG.'
  if (file.size > GRAPHIC_RESOURCE_MAX_BYTES) return 'La imagen supera los 500 KB.'
  return null
}

export function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`
}
