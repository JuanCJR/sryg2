import type { ListBlocksQuery, Paginated } from '@sryg/types'
import type { Block } from '../domain/block'
import type { BlockRepository } from '../domain/block-repository'

export class ListBlocksUseCase {
  constructor(private readonly blocks: BlockRepository) {}

  execute(query: ListBlocksQuery): Promise<Paginated<Block>> {
    return this.blocks.list(query)
  }
}
