import { useState } from 'react'

export interface ClientPagination<T> {
  page: number
  pageCount: number
  pageSize: number
  total: number
  /** Rows of the current page. */
  pageItems: T[]
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
}

/**
 * Pages a list the API already returned in full (an expediente tab, a history, an attachment list).
 * The page clamps when the list shrinks (a deleted row on the last page never leaves it empty).
 */
export function useClientPagination<T>(items: readonly T[], initialPageSize = 10): ClientPagination<T> {
  const [requestedPage, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, requestedPage), pageCount)
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize)

  const setPageSize = (next: number) => {
    setPageSizeState(next)
    setPage(1)
  }

  return { page, pageCount, pageSize, total, pageItems, setPage, setPageSize }
}
