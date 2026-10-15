import type { Alert } from '@sryg/types'
import type { Clock } from '../../common/clock'
import { ConflictError, NotFoundError } from '../../common/errors/domain-errors'
import type { AlertsTransaction } from '../alerts.types'
import { type Actor, ALERT_ENTITY } from './alert'

/** Marks an alert as seen (ALR-06), audited as `reconocer` in the same transaction (BR-11). */
export class AcknowledgeAlertService {
  constructor(
    private readonly transaction: AlertsTransaction,
    private readonly clock: Clock,
  ) {}

  execute(actor: Actor, id: string): Promise<Alert> {
    return this.transaction.run(async ({ alerts, audit }) => {
      const current = await alerts.findById(id)
      if (!current) throw new NotFoundError('Alert not found')
      if (current.acknowledgedAt) throw new ConflictError('Alert already acknowledged')

      const acknowledged = await alerts.acknowledge(id, actor.id, this.clock.now())
      // Acknowledged or recalculated away by a concurrent request since it was read.
      if (!acknowledged) throw new ConflictError('Alert already acknowledged')
      await audit.record({
        actorId: actor.id,
        action: 'reconocer',
        entity: ALERT_ENTITY,
        entityId: id,
        changes: {
          before: { acknowledgedBy: null, acknowledgedAt: null },
          after: { acknowledgedBy: acknowledged.acknowledgedBy, acknowledgedAt: acknowledged.acknowledgedAt },
        },
      })
      return acknowledged
    })
  }
}
