import type { ListBlocksQuery, Paginated } from '@sryg/types'
import type { BlockRepository } from '../repositories/block.repository'
import type { Block } from './block'

export class ListBlocksService {
  constructor(private readonly blocks: BlockRepository) {}

  execute(query: ListBlocksQuery): Promise<Paginated<Block>> {
    return this.blocks.list(query)
  }
}
