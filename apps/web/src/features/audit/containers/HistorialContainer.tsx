import { Pagination } from '../../../design-system'
import { TemplateEmptyFrame, TemplateErrorFrame, TemplateLoadingFrame } from '../../../app/templates/TemplateFrames'
import { AuditFilterBar } from '../components/AuditFilterBar'
import { AuditTable } from '../components/AuditTable'
import { toAuditRow } from '../domain/audit-view'
import { AUDIT_PAGE_SIZE, useAuditTrail } from '../hooks/useAuditTrail'
import styles from './HistorialContainer.module.css'

export interface HistorialContainerProps {
  personId: string
}

/**
 * The Expediente's Historial page key: the person's trail (BR-11) — their record plus the
 * credentials, blocks and attachments that hang from it — filtered by person on the server.
 */
export function HistorialContainer({ personId }: HistorialContainerProps) {
  const { values, errors, page, setPage, setFilter, resource } = useAuditTrail(personId)

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
    const pageCount = Math.max(1, Math.ceil(resource.data.total / AUDIT_PAGE_SIZE))
    body = (
      <>
        <AuditTable label="Historial de la persona" rows={resource.data.items.map(toAuditRow)} />
        {pageCount > 1 ? (
          <div className={styles.footer}>
            <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div className={styles.wrap}>
      <AuditFilterBar values={values} errors={errors} onChange={setFilter} showEntityId={false} />
      {body}
    </div>
  )
}
