import { useState } from 'react'
import { useApiResource } from '../../../shared/api/useApiResource'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { listAudit } from '../data/audit-client'
import { toAuditFilter, validateFilters } from '../domain/audit-view'
import { EMPTY_FILTERS, type AuditFilterValues } from '../domain/types'

export const AUDIT_PAGE_SIZE = 50
const TEXT_DEBOUNCE_MS = 300

/**
 * State shared by the Auditoría page and the Historial tab: the filters as edited, the page, and
 * the server page for the last valid filters. Text fields hit the API once per pause; an invalid
 * filter (partial id, inverted range) keeps the last results instead of sending it.
 */
export function useAuditTrail(personId?: string) {
  const [values, setValues] = useState<AuditFilterValues>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const debounced = useDebouncedValue(values, TEXT_DEBOUNCE_MS)
  // Selects and dates apply at once; only the free-text fields wait for the pause.
  const effective = { ...values, actor: debounced.actor, entityId: debounced.entityId }
  const errors = validateFilters(values)
  const valid = !errors.entityId && !errors.range && !validateFilters(effective).entityId

  const [applied, setApplied] = useState(() => ({ ...toAuditFilter(EMPTY_FILTERS), ...(personId ? { personId } : {}) }))
  const next = { ...toAuditFilter(effective), ...(personId ? { personId } : {}) }
  if (valid && JSON.stringify(next) !== JSON.stringify(applied)) setApplied(next)

  const resource = useApiResource(`audit:${JSON.stringify(applied)}:${page}`, () =>
    listAudit({ ...applied, page, pageSize: AUDIT_PAGE_SIZE }),
  )

  const setFilter = <K extends keyof AuditFilterValues>(key: K, value: AuditFilterValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  return { values, errors, valid, applied, page, setPage, setFilter, resource }
}
