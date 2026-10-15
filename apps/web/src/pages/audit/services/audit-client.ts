import { auditEntrySchema, type AuditEntryDto, type AuditFilter, type Paginated } from '@sryg/types'
import { API_URL } from '../../../common/services/config'
import { ApiError, fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'
import { sessionStore } from '../../../common/services/session'

const itemsSchema = auditEntrySchema.array()

function parsePage(payload: unknown): Paginated<AuditEntryDto> {
  const { items, page, pageSize, total } = (payload ?? {}) as Record<string, unknown>
  if (![page, pageSize, total].every(Number.isInteger)) throw new TypeError('Unexpected audit page')
  return { items: itemsSchema.parse(items), page: page as number, pageSize: pageSize as number, total: total as number }
}

function toParams(filter: AuditFilter & { personId?: string }): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    // Multi-value filters travel as one comma-joined param (`?action=crear,emitir`).
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(','))
    } else if (value) params.set(key, String(value))
  }
  return params
}

export interface AuditListRequest extends AuditFilter {
  personId?: string
  page: number
  pageSize: number
}

/** GET /api/audit — filtered on the server, newest first. */
export async function listAudit(
  { page, pageSize, ...filter }: AuditListRequest,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<Paginated<AuditEntryDto>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  toParams(filter).forEach((value, key) => params.set(key, value))
  return parsePage(await fetchJson<unknown>(`/api/audit?${params.toString()}`))
}

const FALLBACK_FILENAME = 'auditoria.xlsx'

function filenameOf(response: Response): string {
  const match = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')
  return match?.[1] ?? FALLBACK_FILENAME
}

/**
 * GET /api/audit/export.xlsx and hands the file to the browser. `fetchJson` parses JSON only, so
 * this request is made here, with the same session token; a 401 clears the session the same way.
 */
export async function downloadAuditSheet(filter: AuditFilter & { personId?: string }): Promise<void> {
  if (!API_URL) throw new Error('API URL is not configured: set VITE_API_URL at build time.')
  const token = sessionStore.get()
  const query = toParams(filter).toString()
  const response = await fetch(`${API_URL}/api/audit/export.xlsx${query ? `?${query}` : ''}`, {
    headers: {
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!response.ok) {
    if (response.status === 401 && token) sessionStore.clear()
    throw new ApiError(response.status, response.statusText, undefined, response.headers)
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filenameOf(response)
  link.click()
  // Revoked on the next task: some browsers cancel a download whose URL is revoked synchronously.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
