import {
  REPORT_ROW_SCHEMAS,
  type ReportExportFormat,
  type ReportFilters,
  type ReportId,
  type ReportPage,
} from '@sryg/types'
import { API_URL } from '../../../shared/api/config'
import { ApiError, fetchJson as defaultFetchJson, type FetchJson } from '../../../shared/api/fetch-json'
import { sessionStore } from '../../../shared/session/session'

/** Query string of the filters, without the empty ones. */
export function filtersToParams(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, String(value))
  return params
}

function parsePage<R extends ReportId>(report: R, payload: unknown): ReportPage<R> {
  const body = (payload ?? {}) as Record<string, unknown>
  const { page, pageSize, total, thresholdDays } = body
  if (![page, pageSize, total, thresholdDays].every(Number.isInteger) || body.report !== report)
    throw new TypeError('Unexpected report page')
  return {
    report,
    generatedAt: String(body.generatedAt),
    today: String(body.today),
    thresholdDays: thresholdDays as number,
    thresholdIsPlaceholder: body.thresholdIsPlaceholder === true,
    items: REPORT_ROW_SCHEMAS[report].array().parse(body.items) as ReportPage<R>['items'],
    page: page as number,
    pageSize: pageSize as number,
    total: total as number,
  }
}

/** GET /api/reports/:report — one page, with the statuses derived by the API (D10). */
export async function fetchReport<R extends ReportId>(
  report: R,
  filters: ReportFilters,
  { page, pageSize }: { page: number; pageSize: number },
  fetchJson: FetchJson = defaultFetchJson,
): Promise<ReportPage<R>> {
  const params = filtersToParams(filters)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return parsePage(report, await fetchJson<unknown>(`/api/reports/${report}?${params.toString()}`))
}

export interface DownloadDeps {
  baseUrl?: string
  fetchImpl?: typeof fetch
  getToken?: () => string | null
  onUnauthorized?: () => void
}

/**
 * GET /api/reports/:report/export — the whole filtered report as a file. Binary, so it does not go
 * through fetchJson, but it sends the same token and ends the session on a 401 the same way (D4).
 */
export async function downloadReport(
  report: ReportId,
  filters: ReportFilters,
  format: ReportExportFormat,
  {
    baseUrl = API_URL,
    fetchImpl = globalThis.fetch,
    getToken = () => sessionStore.get(),
    onUnauthorized = () => sessionStore.clear(),
  }: DownloadDeps = {},
): Promise<{ blob: Blob; filename: string }> {
  if (!baseUrl) throw new Error('API URL is not configured: set VITE_API_URL at build time.')
  const params = new URLSearchParams({ format })
  for (const [key, value] of filtersToParams(filters)) params.set(key, value)
  const token = getToken()
  const response = await fetchImpl(`${baseUrl}/api/reports/${report}/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized()
    const payload: unknown = await response.json().catch(() => undefined)
    const message = (payload as { message?: string } | undefined)?.message ?? response.statusText
    throw new ApiError(response.status, message, payload, response.headers)
  }
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `${report}.${format}`
  return { blob: await response.blob(), filename }
}
