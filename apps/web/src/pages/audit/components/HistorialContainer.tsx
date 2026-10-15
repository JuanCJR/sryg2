import { Pagination } from '../../../common/components'
import {
  TemplateEmptyFrame,
  TemplateErrorFrame,
  TemplateLoadingFrame,
} from '../../../common/components/TemplateFrames/TemplateFrames'
import { AuditFilterPanel } from './AuditFilterPanel'
import { AuditTable } from './AuditTable'
import { toAuditRow } from '../utils/audit-view'
import { AUDIT_PAGE_SIZES, useAuditTrail } from '../hooks/useAuditTrail'
import styles from './HistorialContainer.module.css'

export interface HistorialContainerProps {
  personId: string
}

/**
 * The Expediente's Historial page key: the person's trail (BR-11) — their record plus the
 * credentials, blocks and attachments that hang from it — filtered by person on the server. The
 * filter column sits left of the results, as on every list page.
 */
export function HistorialContainer({ personId }: HistorialContainerProps) {
  const { values, errors, page, setPage, pageSize, setPageSize, setFilter, clearFilters, resource } =
    useAuditTrail(personId)

  let body
  if (resource.status === 'loading') {
    body = <TemplateLoadingFrame label="Cargando historial" />
  } else if (resource.status === 'error') {
    body = (
      <TemplateErrorFrame
        error={{
          title: 'No se pudo cargar el historial',
          message: 'El servidor no respondió. Intente de nuevo.',
          onRetry: resource.retry,
        }}
      />
    )
  } else if (resource.data.total === 0) {
    body = (
      <TemplateEmptyFrame
        empty={{
          reason: 'no-results',
          title: 'Sin registros para estos filtros',
          message: 'Ningún cambio registrado de esta persona coincide con los filtros elegidos.',
        }}
      />
    )
  } else {
    const { items, total } = resource.data
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    body = (
      <>
        <AuditTable label="Historial de la persona" rows={items.map(toAuditRow)} />
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          total={total}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={AUDIT_PAGE_SIZES}
        />
      </>
    )
  }

  return (
    <div className={styles.layout}>
      <div className={styles.filters}>
        <AuditFilterPanel
          aria-label="Filtros del historial"
          values={values}
          errors={errors}
          onChange={setFilter}
          onClearAll={clearFilters}
          showEntityId={false}
        />
      </div>
      <div className={styles.main}>{body}</div>
    </div>
  )
}
