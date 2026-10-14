import type { ListBlocksQuery, Paginated } from '@sryg/types'
import type { Block, NewBlock } from './block'

export interface BlockRepository {
  findById(id: string): Promise<Block | null>
  list(query: ListBlocksQuery): Promise<Paginated<Block>>
  /** Throws NotFoundError when the person does not exist. */
  create(data: NewBlock, actorId: string): Promise<Block>
  /** Resolves the block only if it is still active; null when it is unknown or already resolved. */
  resolve(id: string, resolutionNote: string, actorId: string): Promise<Block | null>
}
