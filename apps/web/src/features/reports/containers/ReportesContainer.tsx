import { useState } from 'react'
import {
  canAccessReport,
  type ReportExportFormat,
  type ReportFilters,
  type ReportId,
  type ReportPage,
} from '@sryg/types'
import { Breadcrumb, Pagination, useToast } from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { ListPageTemplate } from '../../../app/templates/ListPageTemplate'
import { useApiResource } from '../../../shared/api/useApiResource'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { ActiveBlocksReportTable } from '../components/ActiveBlocksReportTable'
import { ConsolidatedReportTable } from '../components/ConsolidatedReportTable'
import { ExpiryReportTable } from '../components/ExpiryReportTable'
import { ExportActions } from '../components/ExportActions'
import { ReportFiltersBar } from '../components/ReportFiltersBar'
import { ReportPicker } from '../components/ReportPicker'
import { ReportSummary } from '../components/ReportSummary'
import { downloadReport, fetchReport } from '../data/reports-client'
import { EMPTY_FILTERS, type ReportFilterValues } from '../domain/report-filters'
import { visibleReports } from '../domain/report-view'
import styles from './ReportesContainer.module.css'

const PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300
const RANGE_ERROR = 'La fecha final no puede ser anterior a la inicial.'

const LOAD_ERROR = {
  title: 'No se pudo generar el reporte',
  message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
}

function toFilters(values: ReportFilterValues, q: string, report: ReportId): ReportFilters {
  return {
    q: q || undefined,
    licenseTypeId: values.licenseType?.id,
    rav60Category: values.rav60Category || undefined,
    status: report === 'bloqueos_activos' ? undefined : values.status || undefined,
    from: values.from || undefined,
    to: values.to || undefined,
  }
}

/** Saves a downloaded file through a temporary link. */
function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ReportRows({ page }: { page: ReportPage }) {
  switch (page.report) {
    case 'vencimientos':
      return <ExpiryReportTable rows={(page as ReportPage<'vencimientos'>).items} />
    case 'estado_consolidado':
      return <ConsolidatedReportTable rows={(page as ReportPage<'estado_consolidado'>).items} />
    case 'bloqueos_activos':
      return <ActiveBlocksReportTable rows={(page as ReportPage<'bloqueos_activos'>).items} />
  }
}

/**
 * Reportes (REP-01..03, REP-06): the three v1 reports of D10 on `GET /api/reports/:report`, with
 * their filters, and CSV/PDF export for the roles that may export. Consulta only sees report 1.
 */
export function ReportesContainer() {
  const { role, area } = useRole()
  const toast = useToast()
  const reports = role && area ? visibleReports(role, area) : []
  const [report, setReport] = useState<ReportId>('vencimientos')
  const [values, setValues] = useState<ReportFilterValues>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null)
  const q = useDebouncedValue(values.q.trim(), SEARCH_DEBOUNCE_MS)

  const filters = toFilters(values, q, report)
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to)
  const key = rangeInvalid ? null : JSON.stringify([report, filters, page])
  const resource = useApiResource(key, () => fetchReport(report, filters, { page, pageSize: PAGE_SIZE }))
  const canExport = role !== null && area !== null && canAccessReport(role, area, report, 'export')

  const changeReport = (next: ReportId) => {
    setReport(next)
    setValues((current) => ({ ...current, status: '' }))
    setPage(1)
  }
  const changeFilters = (next: ReportFilterValues) => {
    setValues(next)
    setPage(1)
  }
  const handleExport = async (format: ReportExportFormat) => {
    setExporting(format)
    try {
      const { blob, filename } = await downloadReport(report, filters, format)
      saveFile(blob, filename)
    } catch {
      toast.show({ tone: 'error', message: 'No se pudo exportar el reporte. Intente de nuevo.' })
    } finally {
      setExporting(null)
    }
  }

  const common = {
    title: 'Reportes',
    breadcrumb: <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Reportes' }]} />,
    primaryAction: canExport ? (
      <ExportActions pending={exporting} disabled={rangeInvalid} onExport={(format) => void handleExport(format)} />
    ) : undefined,
    toolbar: (
      <div className={styles.toolbar}>
        <ReportPicker reports={reports} value={report} onChange={changeReport} />
        <ReportFiltersBar
          report={report}
          value={values}
          onChange={changeFilters}
          rangeError={rangeInvalid ? RANGE_ERROR : undefined}
        />
      </div>
    ),
  }

  if (rangeInvalid) {
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        empty={{ reason: 'no-results', title: 'Rango de fechas inválido', message: RANGE_ERROR }}
      />
    )
  }
  if (resource.status === 'loading') {
    return <ListPageTemplate {...common} status="loading" loadingLabel="Generando reporte" />
  }
  if (resource.status === 'error') {
    return <ListPageTemplate {...common} status="error" error={{ ...LOAD_ERROR, onRetry: resource.retry }} />
  }

  const data = resource.data
  const summary = (
    <ReportSummary
      total={data.total}
      today={data.today}
      thresholdDays={data.thresholdDays}
      thresholdIsPlaceholder={data.thresholdIsPlaceholder}
    />
  )
  if (data.total === 0) {
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        summary={summary}
        empty={{
          reason: 'no-results',
          title: 'Sin resultados para estos filtros',
          message: 'Ningún registro coincide con los filtros elegidos.',
        }}
      />
    )
  }
  const pageCount = Math.max(1, Math.ceil(data.total / PAGE_SIZE))
  return (
    <ListPageTemplate
      {...common}
      status="ready"
      summary={summary}
      pagination={pageCount > 1 ? <Pagination page={page} pageCount={pageCount} onPageChange={setPage} /> : undefined}
    >
      <ReportRows page={data} />
    </ListPageTemplate>
  )
}
