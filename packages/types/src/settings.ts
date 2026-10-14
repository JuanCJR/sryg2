import type { Rav67Class } from './enums'

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
