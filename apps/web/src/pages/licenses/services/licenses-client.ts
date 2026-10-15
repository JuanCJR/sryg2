import {
  licenseCheckSchema,
  licenseHistoryEntrySchema,
  licenseListItemSchema,
  licenseSchema,
  personnelSchema,
  type IssueLicenseInput,
  type LicenseCheckDto,
  type LicenseDto,
  type LicenseHistoryEntryDto,
  type LicenseListItemDto,
  type Paginated,
  type PersonnelDto,
  type RenewLicenseInput,
} from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'

const listItemsSchema = licenseListItemSchema.array()

export interface LicenseListFilters {
  q?: string
  number?: string
  licenseTypeId?: string
  expiryFrom?: string
  expiryTo?: string
  page: number
  pageSize: number
}

/** GET /api/licenses — the SLYM-like query: applicant, number, type and expiry range, paginated. */
export async function listLicenses(
  filters: LicenseListFilters,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<Paginated<LicenseListItemDto>> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const payload = await fetchJson<unknown>(`/api/licenses?${params.toString()}`)
  const { items, page, pageSize, total } = (payload ?? {}) as Record<string, unknown>
  if (![page, pageSize, total].every(Number.isInteger)) throw new TypeError('Unexpected licenses page')
  return {
    items: listItemsSchema.parse(items),
    page: page as number,
    pageSize: pageSize as number,
    total: total as number,
  }
}

/** GET /api/personnel/:id — the holder the trámite acts on. */
export async function getPerson(id: string, fetchJson: FetchJson = defaultFetchJson): Promise<PersonnelDto> {
  return personnelSchema.parse(await fetchJson<unknown>(`/api/personnel/${encodeURIComponent(id)}`))
}

/** GET /api/personnel/:id/licenses — the person's licenses with their ratings. */
export async function getPersonLicenses(id: string, fetchJson: FetchJson = defaultFetchJson): Promise<LicenseDto[]> {
  return licenseSchema.array().parse(await fetchJson<unknown>(`/api/personnel/${encodeURIComponent(id)}/licenses`))
}

export interface LicenseCheckParams {
  personalId: string
  licenseTypeId?: string
  licenseId?: string
  issueDate?: string
}

/** GET /api/licenses/check — block, D13 coherence and projected expiry, before confirming (LIC-05). */
export async function checkLicense(
  params: LicenseCheckParams,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<LicenseCheckDto> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value)
  return licenseCheckSchema.parse(await fetchJson<unknown>(`/api/licenses/check?${query.toString()}`))
}

/** POST /api/licenses */
export async function issueLicense(body: IssueLicenseInput, fetchJson: FetchJson = defaultFetchJson) {
  return licenseSchema.parse(await fetchJson<unknown>('/api/licenses', { method: 'POST', body }))
}

/** POST /api/licenses/:id/renew */
export async function renewLicense(id: string, body: RenewLicenseInput, fetchJson: FetchJson = defaultFetchJson) {
  return licenseSchema.parse(
    await fetchJson<unknown>(`/api/licenses/${encodeURIComponent(id)}/renew`, { method: 'POST', body }),
  )
}

/** GET /api/licenses/:id/history (LIC-06) */
export async function getLicenseHistory(
  id: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<LicenseHistoryEntryDto[]> {
  return licenseHistoryEntrySchema
    .array()
    .parse(await fetchJson<unknown>(`/api/licenses/${encodeURIComponent(id)}/history`))
}
