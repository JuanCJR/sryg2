import { useState } from 'react'
import { Download } from 'lucide-react'
import { Breadcrumb, Button, Pagination, useToast } from '../../../common/components'
import { ListPageTemplate } from '../../../common/components/ListPageTemplate/ListPageTemplate'
import { AuditFilterPanel } from './AuditFilterPanel'
import { AuditTable } from './AuditTable'
import { downloadAuditCsv } from '../services/audit-client'
import { formatCount, toAuditRow } from '../utils/audit-view'
import { AUDIT_PAGE_SIZES, useAuditTrail } from '../hooks/useAuditTrail'
import styles from './AuditoriaContainer.module.css'

const LOAD_ERROR = {
  title: 'No se pudo cargar la auditoría',
  message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
}

/**
 * Auditoría (REP-04/REP-05) on `GET /api/audit`: the whole trail, newest first, filtered and paged
 * on the server, with a CSV export of the current filters. Read-only; the route guard already
 * limits it to `audit:read` (Admin and Supervisor, D1).
 */
export function AuditoriaContainer() {
  const toast = useToast()
  const { values, errors, valid, applied, page, setPage, pageSize, setPageSize, setFilter, clearFilters, resource } =
    useAuditTrail()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadAuditCsv(applied)
    } catch {
      toast.show({ tone: 'error', message: 'No se pudo exportar la auditoría. Intente de nuevo.' })
    } finally {
      setExporting(false)
    }
  }

  const breadcrumb = <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Auditoría' }]} />
  const filters = <AuditFilterPanel values={values} errors={errors} onChange={setFilter} onClearAll={clearFilters} />
  const toolbar = (
    <div className={styles.toolbar}>
      <Button variant="secondary" icon={Download} loading={exporting} disabled={!valid} onClick={handleExport}>
        Exportar CSV
      </Button>
    </div>
  )
  const common = { title: 'Auditoría', breadcrumb, filters, toolbar }

  if (resource.status === 'loading') {
    return <ListPageTemplate {...common} status="loading" loadingLabel="Cargando auditoría" />
  }
  if (resource.status === 'error') {
    return <ListPageTemplate {...common} status="error" error={{ ...LOAD_ERROR, onRetry: resource.retry }} />
  }

  const { items, total } = resource.data
  const summary = <p className={styles.count}>{formatCount(total)}</p>
  if (total === 0) {
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        summary={summary}
        empty={{
          reason: 'no-results',
          title: 'Sin registros para estos filtros',
          message: 'Ninguna entrada de la auditoría coincide con los filtros elegidos.',
        }}
      />
    )
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return (
    <ListPageTemplate
      {...common}
      status="ready"
      summary={summary}
      pagination={
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          total={total}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={AUDIT_PAGE_SIZES}
        />
      }
    >
      <AuditTable label="Registro de auditoría" rows={items.map(toAuditRow)} />
    </ListPageTemplate>
  )
}
