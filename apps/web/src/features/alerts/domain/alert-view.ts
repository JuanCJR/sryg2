import type { AlertArea, AlertKind, CredentialKind, UserArea } from '@sryg/types'

export type Acknowledgement = 'pendientes' | 'reconocidas' | 'todas'

/** The dashboard filters as edited; `''` means "all". */
export interface AlertFilterValues {
  /** Set by the annunciator keys; `null` shows both kinds. */
  kind: AlertKind | null
  credentialKind: CredentialKind | ''
  area: AlertArea | ''
  acknowledgement: Acknowledgement
}

/**
 * Open alerts of the user's own area first (D24): a Supervisor or Consulta of one area starts on
 * that area and may switch to the other, which they read. `ambas` (and the Admin's usual area)
 * starts on every area. The API does not restrict alerts by area, so this is only the default.
 */
export function defaultFilters(area: UserArea | null): AlertFilterValues {
  return {
    kind: null,
    credentialKind: '',
    area: area === 'licencias' || area === 'medicina' ? area : '',
    acknowledgement: 'pendientes',
  }
}

const ACKNOWLEDGED_PARAM: Record<Acknowledgement, string | null> = {
  pendientes: 'false',
  reconocidas: 'true',
  todas: null,
}

/** GET /api/alerts/summary: every filter but `kind`, so the annunciator keeps counting both kinds. */
export function toSummaryParams({ credentialKind, area, acknowledgement }: AlertFilterValues): URLSearchParams {
  const params = new URLSearchParams()
  if (credentialKind) params.set('credentialKind', credentialKind)
  if (area) params.set('area', area)
  const acknowledged = ACKNOWLEDGED_PARAM[acknowledgement]
  if (acknowledged) params.set('acknowledged', acknowledged)
  return params
}

/** GET /api/alerts. */
export function toAlertsParams(filters: AlertFilterValues, page: number, pageSize: number): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.kind) params.set('kind', filters.kind)
  toSummaryParams(filters).forEach((value, key) => params.set(key, value))
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return params
}

const DAY_MS = 86_400_000

/** UTC calendar day: the API recalculates alerts on the UTC day (alerts README). */
function utcDay(date: Date): number {
  return Math.floor(date.getTime() / DAY_MS)
}

const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`

/** "Vence en 10 días", "Vence hoy" or "Venció hace 3 días". */
export function formatRemaining(dueDate: string, today: Date): string {
  const remaining = utcDay(new Date(`${dueDate}T00:00:00.000Z`)) - utcDay(today)
  if (remaining === 0) return 'Vence hoy'
  return remaining > 0 ? `Vence en ${days(remaining)}` : `Venció hace ${days(-remaining)}`
}

/** `YYYY-MM-DD` as `dd/mm/aaaa`. */
export function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split('-')
  return `${day}/${month}/${year}`
}
