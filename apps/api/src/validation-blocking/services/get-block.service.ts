import { NotFoundError } from '../../common/errors/domain-errors'
import type { BlockRepository } from '../repositories/block.repository'
import type { Block } from './block'

export class GetBlockService {
  constructor(private readonly blocks: BlockRepository) {}

  async execute(id: string): Promise<Block> {
    const found = await this.blocks.findById(id)
    if (!found) throw new NotFoundError('Block not found')
    return found
  }
}
