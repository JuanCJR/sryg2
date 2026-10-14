import type { ResolveBlockInput } from '@sryg/types'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import { type Actor, BLOCK_ENTITY, type Block } from '../domain/block'
import type { BlockingUnitOfWork } from '../domain/blocking-unit-of-work'

/** BR-08 / D2: lifts an active block with a mandatory resolution note. A block is resolved once. */
export class ResolveBlockUseCase {
  constructor(private readonly uow: BlockingUnitOfWork) {}

  async execute(actor: Actor, id: string, input: ResolveBlockInput): Promise<Block> {
    return this.uow.run(async ({ blocks, audit }) => {
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
