import {
  licenseSchema,
  personMedicalCertificatesSchema,
  publicVerificationSchema,
  type PublicVerification,
} from '@sryg/types'
import { API_URL } from '../../../shared/api/config'
import {
  ApiError,
  createFetchJson,
  fetchJson as defaultFetchJson,
  type FetchJson,
} from '../../../shared/api/fetch-json'
import { sessionStore } from '../../../shared/session/session'
import { MEDICAL_CLASS_LABEL, type CredentialKind, type PrintableCredential } from '../domain/credential-view'

const personPath = (personalId: string) => `/api/personnel/${encodeURIComponent(personalId)}`

/** Without a session: the QR page is public and never sends nor clears the user's token. */
const publicFetchJson = createFetchJson(API_URL)

/** GET /api/public/verify/:token — public, only the D9 fields. */
export async function verifyCredential(
  token: string,
  fetchJson: FetchJson = publicFetchJson,
): Promise<PublicVerification> {
  return publicVerificationSchema.parse(await fetchJson<unknown>(`/api/public/verify/${encodeURIComponent(token)}`))
}

/**
 * The person's licenses and/or medical certificates as printable cards. Only the kinds the user may
 * print are requested (D24).
 */
export async function listPrintableCredentials(
  personalId: string,
  kinds: { license: boolean; medical: boolean },
  fetchJson: FetchJson = defaultFetchJson,
): Promise<PrintableCredential[]> {
  const [licenses, certificates] = await Promise.all([
    kinds.license
      ? fetchJson<unknown>(`${personPath(personalId)}/licenses`).then((body) => licenseSchema.array().parse(body))
      : [],
    kinds.medical
      ? fetchJson<unknown>(`${personPath(personalId)}/medical-certificates`).then(
          (body) => personMedicalCertificatesSchema.parse(body).items,
        )
      : [],
  ])
  return [
    ...licenses.map((l): PrintableCredential => ({
      kind: 'license',
      id: l.id,
      number: l.number,
      description: l.licenseType.nameEs,
      expiryDate: l.expiryDate,
      status: l.status,
    })),
    ...certificates.map((c): PrintableCredential => ({
      kind: 'medical',
      id: c.id,
      number: c.number,
      description: MEDICAL_CLASS_LABEL[c.rav67Class],
      expiryDate: c.expiryDate,
      status: c.status,
    })),
  ]
}

export interface DownloadDeps {
  baseUrl?: string
  fetchImpl?: typeof fetch
  getToken?: () => string | null
  onUnauthorized?: () => void
}

const PDF_SEGMENT: Record<CredentialKind, string> = { license: 'license', medical: 'medical' }

/**
 * GET /api/personnel/:id/credentials/{license|medical}/:id.pdf — binary, so it does not go through
 * fetchJson, but it sends the same token and ends the session on a 401 the same way (D4).
 */
export async function downloadCredentialPdf(
  personalId: string,
  { kind, id }: { kind: CredentialKind; id: string },
  {
    baseUrl = API_URL,
    fetchImpl = globalThis.fetch,
    getToken = () => sessionStore.get(),
    onUnauthorized = () => sessionStore.clear(),
  }: DownloadDeps = {},
): Promise<{ blob: Blob; filename: string }> {
  if (!baseUrl) throw new Error('API URL is not configured: set VITE_API_URL at build time.')
  const token = getToken()
  const path = `${personPath(personalId)}/credentials/${PDF_SEGMENT[kind]}/${encodeURIComponent(id)}.pdf`
  const response = await fetchImpl(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized()
    const payload: unknown = await response.json().catch(() => undefined)
    const message = (payload as { message?: string } | undefined)?.message ?? response.statusText
    throw new ApiError(response.status, message, payload, response.headers)
  }
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `credencial-${kind}.pdf`
  return { blob: await response.blob(), filename }
}
