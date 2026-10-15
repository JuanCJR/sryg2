import { useState } from 'react'
import type { BlockDto, Paginated } from '@sryg/types'
import { useApiResource, type Resource } from '../../../common/hooks/useApiResource'
import { listBlocks, type BlocksQuery } from '../services/blocking-client'
import { useBlocksVersion } from '../services/blocks-changes'

/**
 * `GET /api/blocks` for `query` (null = nothing to load). After a block changes, the previous page
 * stays on screen while it reloads: a refresh never collapses the list (or its local filters) into
 * a loading frame.
 */
export function useBlocks(query: BlocksQuery | null): Resource<Paginated<BlockDto>> {
  const version = useBlocksVersion()
  const base = query ? JSON.stringify(query) : null
  const resource = useApiResource(base ? `blocks:${base}:${version}` : null, () => listBlocks(query!))
  const [last, setLast] = useState<{ base: string; data: Paginated<BlockDto>; retry: () => void } | null>(null)

  if (resource.status === 'ready' && base && (last?.base !== base || last.data !== resource.data)) {
    setLast({ base, data: resource.data, retry: resource.retry })
  }
  if (resource.status === 'loading' && last && last.base === base) {
    return { status: 'ready', data: last.data, retry: last.retry }
  }
  return resource
}
