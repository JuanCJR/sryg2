import type { CreateBlockInput } from '@sryg/types'
import type { BlockingTransaction } from '../validation-blocking.types'
import { type Actor, BLOCK_ENTITY, type Block } from './block'

/** BR-07: registers an impediment; credentials are not issued for the person while it is active. */
export class RegisterBlockService {
  constructor(private readonly transaction: BlockingTransaction) {}

  async execute(actor: Actor, input: CreateBlockInput): Promise<Block> {
    return this.transaction.run(async ({ blocks, audit }) => {
      // The entity is written first: an unknown person throws before any audit row exists.
      const created = await blocks.create(
        { personalId: input.personalId, type: input.type, reason: input.reason },
        actor.id,
      )
      await audit.record({
        actorId: actor.id,
        action: 'bloquear',
        entity: BLOCK_ENTITY,
        entityId: created.id,
        changes: {
          after: {
            personalId: created.personalId,
            type: created.type,
            reason: created.reason,
            status: created.status,
          },
        },
      })
      return created
    })
  }
}
