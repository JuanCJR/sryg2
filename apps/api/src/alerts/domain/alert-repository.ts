import type { Alert, AlertsQuery, AlertsSummary, AlertsSummaryQuery, Paginated } from '@sryg/types'
import type { DesiredAlert, ExpiringCredential } from './alert'

export type AlertFilters = AlertsSummaryQuery

export interface AlertRepository {
  /** Serializes recalculations (daily job and concurrent GETs) until the transaction ends. */
  lockForRecalculation(): Promise<void>
  /** Licenses, type and class ratings and medical certificates expiring on or before `until`. */
  findExpiringCredentials(until: string): Promise<ExpiringCredential[]>
  /**
   * Leaves the table holding exactly `desired`: inserts the missing alerts, moves the due date of the
   * existing ones (reopening them when it changes) and deletes the rest.
   */
  sync(desired: readonly DesiredAlert[]): Promise<{ created: number; updated: number; removed: number }>
  list(query: AlertsQuery): Promise<Paginated<Alert>>
  summary(filters: AlertFilters): Promise<AlertsSummary>
  findById(id: string): Promise<Alert | null>
  /** Null when the alert does not exist or is already acknowledged. */
  acknowledge(id: string, actorId: string, at: Date): Promise<Alert | null>
}
