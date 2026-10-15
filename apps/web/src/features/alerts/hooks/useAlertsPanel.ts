import { useState } from 'react'
import type { AlertKind, UserArea } from '@sryg/types'
import { useApiResource } from '../../../shared/api/useApiResource'
import { getAlertsSummary, listAlerts } from '../data/alerts-client'
import { defaultFilters, toAlertsParams, toSummaryParams, type AlertFilterValues } from '../domain/alert-view'

export const ALERTS_PAGE_SIZE = 20

/**
 * State of /panel: the filters (starting on the user's area, D24), the page, and the server list
 * and summary for them. `reload` asks both again (after an acknowledgement).
 */
export function useAlertsPanel(userArea: UserArea | null) {
  const [filters, setFilters] = useState<AlertFilterValues>(() => defaultFilters(userArea))
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)

  const listParams = toAlertsParams(filters, page, ALERTS_PAGE_SIZE)
  const summaryParams = toSummaryParams(filters)
  const alerts = useApiResource(`alerts:${listParams.toString()}:${version}`, () => listAlerts(listParams))
  const summary = useApiResource(`alerts-summary:${summaryParams.toString()}:${version}`, () =>
    getAlertsSummary(summaryParams),
  )

  const setFilter = <K extends keyof AlertFilterValues>(key: K, value: AlertFilterValues[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }
  /** The annunciator's toggle: pressing the selected kind again clears it. */
  const toggleKind = (kind: AlertKind) => setFilter('kind', filters.kind === kind ? null : kind)
  const reload = () => setVersion((n) => n + 1)

  return { filters, setFilter, toggleKind, page, setPage, alerts, summary, reload }
}
