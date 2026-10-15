import { accessLogSchema, type AccessLog, type Alert, type AlertsSummary, type Paginated } from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'

function parsePage(payload: unknown): Paginated<Alert> {
  const { items, page, pageSize, total } = (payload ?? {}) as Record<string, unknown>
  if (!Array.isArray(items) || ![page, pageSize, total].every(Number.isInteger)) {
    throw new TypeError('Unexpected alerts page')
  }
  return { items: items as Alert[], page: page as number, pageSize: pageSize as number, total: total as number }
}

function parseSummary(payload: unknown): AlertsSummary {
  const summary = (payload ?? {}) as Partial<AlertsSummary>
  if (!Number.isInteger(summary.total) || !summary.byKind) throw new TypeError('Unexpected alerts summary')
  return summary as AlertsSummary
}

const withQuery = (path: string, params: URLSearchParams) => {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

/** GET /api/alerts — recalculated by the API before answering (D6), ordered by due date. */
export async function listAlerts(params: URLSearchParams, fetchJson: FetchJson = defaultFetchJson) {
  return parsePage(await fetchJson<unknown>(withQuery('/api/alerts', params)))
}

/** GET /api/alerts/summary. */
export async function getAlertsSummary(params: URLSearchParams, fetchJson: FetchJson = defaultFetchJson) {
  return parseSummary(await fetchJson<unknown>(withQuery('/api/alerts/summary', params)))
}

/** POST /api/alerts/:id/acknowledge (ALR-06): audited as `reconocer`; 409 if already acknowledged. */
export async function acknowledgeAlert(id: string, fetchJson: FetchJson = defaultFetchJson): Promise<void> {
  await fetchJson<unknown>(`/api/alerts/${id}/acknowledge`, { method: 'POST' })
}

/** GET /api/auth/me/access-log (D23). */
export async function getAccessLog(fetchJson: FetchJson = defaultFetchJson): Promise<AccessLog> {
  return accessLogSchema.parse(await fetchJson<unknown>('/api/auth/me/access-log'))
}
