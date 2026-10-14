import { NotFoundError } from '../../shared/domain/errors'
import type { Block } from '../domain/block'
import type { BlockRepository } from '../domain/block-repository'

export class GetBlockUseCase {
  constructor(private readonly blocks: BlockRepository) {}

  async execute(id: string): Promise<Block> {
    const found = await this.blocks.findById(id)
    if (!found) throw new NotFoundError('Block not found')
    return found
  }
}
