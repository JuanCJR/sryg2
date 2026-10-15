import {
  type CatalogOption,
  catalogOptionSchema,
  type CreatePersonnelInput,
  type Paginated,
  type PersonnelAttachmentDto,
  personnelAttachmentSchema,
  type PersonnelDto,
  type PersonnelImageKind,
  personnelSchema,
  type UpdatePersonnelInput,
} from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'
import { fetchBlob, sendFile } from './file-client'

const itemsSchema = personnelSchema.array()
const attachmentsSchema = personnelAttachmentSchema.array()
const optionsSchema = catalogOptionSchema.array()

function parsePage(payload: unknown): Paginated<PersonnelDto> {
  const { items, page, pageSize, total } = (payload ?? {}) as Record<string, unknown>
  if (![page, pageSize, total].every(Number.isInteger)) throw new TypeError('Unexpected personnel page')
  return { items: itemsSchema.parse(items), page: page as number, pageSize: pageSize as number, total: total as number }
}

export interface PersonnelListQuery {
  q?: string
  page: number
  pageSize: number
}

const personnelPath = (id: string) => `/api/personnel/${encodeURIComponent(id)}`

/** GET /api/personnel — search by name or cédula, paginated on the server. */
export async function listPersonnel(
  { q, page, pageSize }: PersonnelListQuery,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<Paginated<PersonnelDto>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (q) params.set('q', q)
  return parsePage(await fetchJson<unknown>(`/api/personnel?${params.toString()}`))
}

/** GET /api/personnel/:id */
export async function getPersonnel(id: string, fetchJson: FetchJson = defaultFetchJson): Promise<PersonnelDto> {
  return personnelSchema.parse(await fetchJson<unknown>(personnelPath(id)))
}

/** POST /api/personnel */
export async function createPersonnel(
  input: CreatePersonnelInput,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<PersonnelDto> {
  return personnelSchema.parse(await fetchJson<unknown>('/api/personnel', { method: 'POST', body: input }))
}

/** PATCH /api/personnel/:id — only the fields that changed. */
export async function updatePersonnel(
  id: string,
  changes: UpdatePersonnelInput,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<PersonnelDto> {
  return personnelSchema.parse(await fetchJson<unknown>(personnelPath(id), { method: 'PATCH', body: changes }))
}

const IMAGE_PATH: Record<PersonnelImageKind, string> = { photo: 'photo', signature: 'signature' }

/** PUT /api/personnel/:id/photo|signature — the server compresses it (D5). */
export async function uploadPersonnelImage(id: string, kind: PersonnelImageKind, file: File): Promise<PersonnelDto> {
  return personnelSchema.parse(await sendFile(`${personnelPath(id)}/${IMAGE_PATH[kind]}`, 'PUT', file))
}

/** GET /api/personnel/:id/photo|signature */
export function fetchPersonnelImage(id: string, kind: PersonnelImageKind): Promise<Blob> {
  return fetchBlob(`${personnelPath(id)}/${IMAGE_PATH[kind]}`)
}

const attachmentsPath = (id: string) => `${personnelPath(id)}/attachments`

/** GET /api/personnel/:id/attachments */
export async function listAttachments(
  id: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<PersonnelAttachmentDto[]> {
  return attachmentsSchema.parse(await fetchJson<unknown>(attachmentsPath(id)))
}

/** POST /api/personnel/:id/attachments (multipart: `file` + `attachmentTypeId`). */
export async function uploadAttachment(
  id: string,
  attachmentTypeId: string,
  file: File,
): Promise<PersonnelAttachmentDto> {
  return personnelAttachmentSchema.parse(await sendFile(attachmentsPath(id), 'POST', file, { attachmentTypeId }))
}

export function downloadAttachment(id: string, attachmentId: string): Promise<Blob> {
  return fetchBlob(`${attachmentsPath(id)}/${encodeURIComponent(attachmentId)}`)
}

export async function deleteAttachment(
  id: string,
  attachmentId: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<void> {
  await fetchJson<unknown>(`${attachmentsPath(id)}/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' })
}

// The options endpoint has no lookup by id: the record's current item is found among the active
// ones (document types and nationalities are short catalogs). Null when it was deactivated since.
const LOOKUP_LIMIT = 100

/** The catalog option a record points to, so the form can show its name. */
export async function findCatalogOption(
  catalog: 'document-types' | 'nationalities',
  id: string,
  fetchJson: FetchJson = defaultFetchJson,
): Promise<CatalogOption | null> {
  const options = optionsSchema.parse(
    await fetchJson<unknown>(`/api/catalogs/${catalog}/options?limit=${LOOKUP_LIMIT}`),
  )
  return options.find((option) => option.id === id) ?? null
}
