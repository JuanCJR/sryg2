import { z } from 'zod'
import { GRAPHIC_RESOURCE_KINDS, type GraphicResourceKind, type Rav67Class } from './enums'

/** Keys of `parametro_sistema` (D3, D15). Values are stored as JSON numbers. */
export const ALERT_THRESHOLD_KEY = 'alerts.threshold_days'
export const MEDICAL_VALIDITY_KEYS = {
  clase_1: 'medical.validity_months.clase_1',
  clase_2: 'medical.validity_months.clase_2',
  clase_3: 'medical.validity_months.clase_3',
} as const satisfies Record<Rav67Class, string>

export const SETTING_KEYS = [ALERT_THRESHOLD_KEY, ...Object.values(MEDICAL_VALIDITY_KEYS)] as const
export type SettingKey = (typeof SETTING_KEYS)[number]

/** Placeholders loaded until INAC supplies the real values (D3); shown as `PENDIENTE INAC`. */
export const PLACEHOLDER_SETTINGS: Record<SettingKey, number> = {
  'alerts.threshold_days': 30,
  'medical.validity_months.clase_1': 12,
  'medical.validity_months.clase_2': 12,
  'medical.validity_months.clase_3': 12,
}
/** Placeholder validity, in months, for each license type of the catalog (D3). */
export const PLACEHOLDER_LICENSE_VALIDITY_MONTHS = 12
export const PENDING_INAC_LABEL = 'PENDIENTE INAC'

const positiveWhole = z.int().positive()

/** Body of `PUT /api/settings/parameters/alert-threshold`. Saving clears the placeholder mark (D3). */
export const alertThresholdInputSchema = z.object({ days: positiveWhole }).strict()
export type AlertThresholdInput = z.infer<typeof alertThresholdInputSchema>

/** Body of `PUT /api/settings/parameters/medical-validity`: months per RAV 67 class (D3, BR-04). */
export const medicalValidityInputSchema = z
  .object({ clase_1: positiveWhole, clase_2: positiveWhole, clase_3: positiveWhole })
  .strict() satisfies z.ZodType<Record<Rav67Class, number>>
export type MedicalValidityInput = z.infer<typeof medicalValidityInputSchema>

export interface ParameterDto {
  value: number
  /** True until the Admin saves a value: the UI shows `PENDIENTE INAC` (D3). */
  isPlaceholder: boolean
  updatedAt: string
}

/** `GET /api/settings/parameters`. License-type validity lives in the catalog (W1-11), not here. */
export interface SettingsParametersDto {
  alertThresholdDays: ParameterDto
  medicalValidityMonths: Record<Rav67Class, ParameterDto>
}

/** Credential images (D18): `PUT /api/settings/graphic-resources/:kind` with the raw image as body. */
export const GRAPHIC_RESOURCE_MIME_TYPES = ['image/png', 'image/jpeg'] as const
export type GraphicResourceMime = (typeof GRAPHIC_RESOURCE_MIME_TYPES)[number]
export const GRAPHIC_RESOURCE_MAX_BYTES = 500 * 1024

export const graphicResourceKindSchema = z.enum(GRAPHIC_RESOURCE_KINDS)

/** Metadata of one resource; the bytes are served by `GET /api/settings/graphic-resources/:kind`. */
export interface GraphicResourceDto {
  kind: GraphicResourceKind
  /** False while INAC has not supplied the image: the credential PDF prints a placeholder (D18). */
  configured: boolean
  mime: GraphicResourceMime | null
  size: number | null
  updatedAt: string | null
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const startsWith = (bytes: Uint8Array, signature: number[]) =>
  bytes.length >= signature.length && signature.every((byte, i) => bytes[i] === byte)

/** Image type read from the file signature, so a mislabeled upload is rejected. */
export function detectGraphicImageMime(bytes: Uint8Array): GraphicResourceMime | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return 'image/png'
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'image/jpeg'
  return null
}
