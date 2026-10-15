import { useState } from 'react'
import type { AlertKind, UserArea } from '@sryg/types'
import { useApiResource } from '../../../shared/api/useApiResource'
import { getAlertsSummary, listAlerts } from '../data/alerts-client'
import { defaultFilters, toAlertsParams, toSummaryParams, type AlertFilterValues } from '../domain/alert-view'

export const ALERTS_PAGE_SIZE = 20
export const ALERTS_PAGE_SIZES = [10, 20, 50, 100] as const

/**
 * State of /panel: the filters (starting on the user's area, D24), the page and its size, and the
 * server list and summary for them. `reload` asks both again (after an acknowledgement). Every
 * filter change returns to page 1.
 */
export function useAlertsPanel(userArea: UserArea | null) {
  const [filters, setFilters] = useState<AlertFilterValues>(() => defaultFilters(userArea))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(ALERTS_PAGE_SIZE)
  const [version, setVersion] = useState(0)

  const listParams = toAlertsParams(filters, page, pageSize)
  const summaryParams = toSummaryParams(filters)
  const alerts = useApiResource(`alerts:${listParams.toString()}:${version}`, () => listAlerts(listParams))
  const summary = useApiResource(`alerts-summary:${summaryParams.toString()}:${version}`, () =>
    getAlertsSummary(summaryParams),
  )

  const setFilter = <K extends keyof AlertFilterValues>(key: K, value: AlertFilterValues[K]) => {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }
  /** "Limpiar todo" of the filter panel: every credential, area and acknowledgement (the annunciator keeps its key). */
  const clearFilters = () => {
    setFilters((current) => ({ ...current, credentialKind: [], area: [], acknowledgement: [] }))
    setPage(1)
  }
  /** The annunciator's toggle: pressing the selected kind again clears it. */
  const toggleKind = (kind: AlertKind) => setFilter('kind', filters.kind === kind ? null : kind)
  const setPageSize = (next: number) => {
    setPageSizeState(next)
    setPage(1)
  }
  const reload = () => setVersion((n) => n + 1)

  return {
    filters,
    setFilter,
    clearFilters,
    toggleKind,
    page,
    setPage,
    pageSize,
    setPageSize,
    alerts,
    summary,
    reload,
  }
}
