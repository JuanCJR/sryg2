import {
  blockSchema,
  type BlockDto,
  type BlockStatus,
  type BlockType,
  type CreateBlockInput,
  type Paginated,
} from '@sryg/types'
import { fetchJson as defaultFetchJson, type FetchJson } from '../../../common/services/fetch-json'

const itemsSchema = blockSchema.array()

function parsePage(payload: unknown): Paginated<BlockDto> {
  const { items, page, pageSize, total } = (payload ?? {}) as Record<string, unknown>
  if (![page, pageSize, total].every(Number.isInteger)) throw new TypeError('Unexpected blocks page')
  return { items: itemsSchema.parse(items), page: page as number, pageSize: pageSize as number, total: total as number }
}

export interface BlocksQuery {
  /** Empty or absent = every status. */
  status?: readonly BlockStatus[]
  /** Empty or absent = every type. */
  type?: readonly BlockType[]
  personalId?: string
  /** Person name or cédula. */
  q?: string
  page: number
  pageSize: number
}

/** GET /api/blocks — filtered by status, type and person, newest first. Multi-value filters travel comma-joined. */
export async function listBlocks(query: BlocksQuery, fetchJson: FetchJson = defaultFetchJson) {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) })
  for (const key of ['status', 'type'] as const) {
    const values = query[key]
    if (values?.length) params.set(key, values.join(','))
  }
  for (const key of ['personalId', 'q'] as const) {
    const value = query[key]
    if (value) params.set(key, value)
  }
  return parsePage(await fetchJson<unknown>(`/api/blocks?${params.toString()}`))
}

/** POST /api/blocks — registers an active block (BR-07). */
export async function registerBlock(input: CreateBlockInput, fetchJson: FetchJson = defaultFetchJson) {
  return blockSchema.parse(await fetchJson<unknown>('/api/blocks', { method: 'POST', body: input }))
}

/** POST /api/blocks/:id/resolve — lifts the block with a mandatory note (BR-08). */
export async function resolveBlock(id: string, resolutionNote: string, fetchJson: FetchJson = defaultFetchJson) {
  return blockSchema.parse(
    await fetchJson<unknown>(`/api/blocks/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: { resolutionNote },
    }),
  )
}
