import { z } from 'zod'
import { csvEnum } from './common'
import { ALERT_KINDS, CREDENTIAL_KINDS, type AlertKind, type CredentialKind, type UserArea } from './enums'

// Contracts of the alerts module (W1-9).
export const alertKindSchema = z.enum(ALERT_KINDS)
export const credentialKindSchema = z.enum(CREDENTIAL_KINDS)

/** Area that manages each credential (D24): an alert belongs to the area of its credential. */
export type AlertArea = Exclude<UserArea, 'ambas'>
export const ALERT_AREAS = ['licencias', 'medicina'] as const satisfies readonly AlertArea[]
const CREDENTIAL_KIND_AREA: Record<CredentialKind, AlertArea> = {
  licencia: 'licencias',
  habilitacion_tipo: 'licencias',
  habilitacion_clase: 'licencias',
  certificado_medico: 'medicina',
}
export const alertAreaOf = (kind: CredentialKind): AlertArea => CREDENTIAL_KIND_AREA[kind]

// Query strings carry text: `z.coerce.boolean` would read "false" as true.
const booleanQuery = z.enum(['true', 'false']).transform((value) => value === 'true')

/** `kind`, `area` and `credentialKind` are multi-value: `?area=a,b` or repeated params. */
const alertFilters = {
  kind: csvEnum(ALERT_KINDS),
  acknowledged: booleanQuery.optional(),
  area: csvEnum(ALERT_AREAS),
  credentialKind: csvEnum(CREDENTIAL_KINDS),
  personalId: z.uuid().optional(),
}

/** GET /api/alerts. */
export const alertsQuerySchema = z.object({
  ...alertFilters,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type AlertsQuery = z.infer<typeof alertsQuerySchema>

/** GET /api/alerts/summary. */
export const alertsSummaryQuerySchema = z.object(alertFilters)
export type AlertsSummaryQuery = z.infer<typeof alertsSummaryQuerySchema>

export interface Alert {
  id: string
  personalId: string
  /** Holder, so the dashboard can name the person without another request. */
  personnel: { cedula: string; firstNames: string; lastNames: string }
  credentialKind: CredentialKind
  credentialId: string
  area: AlertArea
  kind: AlertKind
  /** Expiry date of the credential, `YYYY-MM-DD`. */
  dueDate: string
  acknowledgedBy: string | null
  /** ISO timestamp. */
  acknowledgedAt: string | null
  createdAt: string
}

export interface AlertsSummary {
  total: number
  byKind: Record<AlertKind, number>
  byAcknowledgement: { pending: number; acknowledged: number }
  byCredentialKind: Record<CredentialKind, number>
  byArea: Record<AlertArea, number>
}
