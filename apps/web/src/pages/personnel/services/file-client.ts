import { API_URL } from '../../../common/services/config'
import { ApiError } from '../../../common/services/fetch-json'
import { sessionStore } from '../../../common/services/session'

/**
 * Requests whose body or answer is not JSON: multipart uploads (photo, signature, attachments) and
 * binary downloads. Same contract as the app's `fetchJson`: Bearer from the session, `ApiError` on
 * failure, and a 401 clears the session (D4).
 */
async function send(path: string, init: RequestInit): Promise<Response> {
  if (!API_URL) throw new Error('API URL is not configured: set VITE_API_URL at build time.')
  const token = sessionStore.get()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  // No Content-Type for FormData: the browser sets the multipart boundary.
  const response = await globalThis.fetch(`${API_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined)
    if (response.status === 401 && token) sessionStore.clear()
    const message = (payload as { message?: string } | undefined)?.message ?? response.statusText
    throw new ApiError(response.status, message, payload, response.headers)
  }
  return response
}

/** Sends `fields` and `file` as multipart/form-data and returns the JSON answer. */
export async function sendFile(
  path: string,
  method: 'POST' | 'PUT',
  file: File,
  fields: Record<string, string> = {},
): Promise<unknown> {
  const body = new FormData()
  for (const [name, value] of Object.entries(fields)) body.append(name, value)
  body.append('file', file)
  const response = await send(path, { method, body })
  return response.json()
}

export async function fetchBlob(path: string): Promise<Blob> {
  return (await send(path, { method: 'GET' })).blob()
}
