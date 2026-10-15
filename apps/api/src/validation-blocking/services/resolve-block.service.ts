import type { ResolveBlockInput } from '@sryg/types'
import { ConflictError, NotFoundError } from '../../common/errors/domain-errors'
import type { BlockingTransaction } from '../validation-blocking.types'
import { type Actor, BLOCK_ENTITY, type Block } from './block'

/** BR-08 / D2: lifts an active block with a mandatory resolution note. A block is resolved once. */
export class ResolveBlockService {
  constructor(private readonly transaction: BlockingTransaction) {}

  async execute(actor: Actor, id: string, input: ResolveBlockInput): Promise<Block> {
    return this.transaction.run(async ({ blocks, audit }) => {
      const current = await blocks.findById(id)
      if (!current) throw new NotFoundError('Block not found')
      // The repository only updates an active row, so a concurrent resolution also lands here.
      const resolved = current.status === 'activo' ? await blocks.resolve(id, input.resolutionNote, actor.id) : null
      if (!resolved) throw new ConflictError('Block is already resolved')
      await audit.record({
        actorId: actor.id,
        action: 'resolver',
        entity: BLOCK_ENTITY,
        entityId: id,
        changes: {
          before: { status: current.status },
          after: { status: resolved.status, resolutionNote: resolved.resolutionNote },
        },
      })
      return resolved
    })
  }
}
