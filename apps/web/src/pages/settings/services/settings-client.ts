import type {
  AlertThresholdInput,
  GraphicResourceDto,
  GraphicResourceKind,
  MedicalValidityInput,
  SettingsParametersDto,
} from '@sryg/types'
import { API_URL } from '../../../common/services/config'
import { ApiError, fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'
import { sessionStore } from '../../../common/services/session'

/** GET /api/settings/parameters — alert threshold and RAV 67 validity, with their placeholder flag (D3). */
export function getParameters(fetchJson: FetchJson = defaultFetchJson) {
  return fetchJson<SettingsParametersDto>('/api/settings/parameters')
}

export function putMedicalValidity(body: MedicalValidityInput, fetchJson: FetchJson = defaultFetchJson) {
  return fetchJson<SettingsParametersDto>('/api/settings/parameters/medical-validity', { method: 'PUT', body })
}

export function putAlertThreshold(body: AlertThresholdInput, fetchJson: FetchJson = defaultFetchJson) {
  return fetchJson<SettingsParametersDto>('/api/settings/parameters/alert-threshold', { method: 'PUT', body })
}

/** GET /api/settings/graphic-resources — metadata of the credential images (D18). */
export function listGraphicResources(fetchJson: FetchJson = defaultFetchJson) {
  return fetchJson<GraphicResourceDto[]>('/api/settings/graphic-resources')
}

const resourcePath = (kind: GraphicResourceKind) => `/api/settings/graphic-resources/${encodeURIComponent(kind)}`

/**
 * The image endpoints carry bytes, not JSON, so they bypass `fetchJson` but keep its session rules:
 * the stored bearer token and, on a 401, a cleared session (D4).
 */
async function fetchBinary(path: string, init: RequestInit = {}): Promise<Response> {
  if (!API_URL) throw new Error('API URL is not configured: set VITE_API_URL at build time.')
  const token = sessionStore.get()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    if (response.status === 401 && token) sessionStore.clear()
    const payload: unknown = await response.json().catch(() => undefined)
    const message = (payload as { message?: string } | undefined)?.message ?? response.statusText
    throw new ApiError(response.status, message, payload, response.headers)
  }
  return response
}

/** GET /api/settings/graphic-resources/:kind — the stored image. */
export async function getGraphicResourceImage(kind: GraphicResourceKind): Promise<Blob> {
  return (await fetchBinary(resourcePath(kind))).blob()
}

/** PUT /api/settings/graphic-resources/:kind — the raw PNG or JPEG as the body. */
export async function uploadGraphicResource(kind: GraphicResourceKind, file: File): Promise<GraphicResourceDto> {
  const response = await fetchBinary(resourcePath(kind), {
    method: 'PUT',
    headers: { 'Content-Type': file.type, Accept: 'application/json' },
    body: file,
  })
  return (await response.json()) as GraphicResourceDto
}
