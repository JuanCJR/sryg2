import { useState } from 'react'
import { canAccessReport, type ReportExportFormat, type ReportId, type ReportPage } from '@sryg/types'
import { Breadcrumb, Pagination, useToast } from '../../../common/components'
import { useRole } from '../../../common/hooks/useRole'
import { ListPageTemplate } from '../../../common/components/ListPageTemplate/ListPageTemplate'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { useDebouncedValue } from '../../../common/hooks/useDebouncedValue'
import { ActiveBlocksReportTable } from './ActiveBlocksReportTable'
import { ConsolidatedReportTable } from './ConsolidatedReportTable'
import { ExpiryReportTable } from './ExpiryReportTable'
import { ExportActions } from './ExportActions'
import { ReportFilterPanel } from './ReportFilterPanel'
import { ReportPicker } from './ReportPicker'
import { ReportSummary } from './ReportSummary'
import { downloadReport, fetchReport } from '../services/reports-client'
import { EMPTY_FILTERS, toReportFilters, type ReportFilterValues } from '../utils/report-filters'
import { STATUS_FILTERS, visibleReports } from '../utils/report-view'

const DEFAULT_PAGE_SIZE = 50
/** The API pages up to 200 rows. */
const PAGE_SIZES = [25, 50, 100, 200] as const
const SEARCH_DEBOUNCE_MS = 300
const RANGE_ERROR = 'La fecha final no puede ser anterior a la inicial.'

const LOAD_ERROR = {
  title: 'No se pudo generar el reporte',
  message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
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
 * their filters, and Excel/PDF export for the roles that may export. Consulta only sees report 1.
 */
export function ReportesContainer() {
  const { role, area } = useRole()
  const toast = useToast()
  const reports = role && area ? visibleReports(role, area) : []
  const [report, setReport] = useState<ReportId>('vencimientos')
  const [values, setValues] = useState<ReportFilterValues>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null)
  const q = useDebouncedValue(values.q.trim(), SEARCH_DEBOUNCE_MS)

  const filters = toReportFilters(values, q, report)
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to)
  const key = rangeInvalid ? null : JSON.stringify([report, filters, page, pageSize])
  const resource = useApiResource(key, () => fetchReport(report, filters, { page, pageSize }))
  const canExport = role !== null && area !== null && canAccessReport(role, area, report, 'export')

  const changeReport = (next: ReportId) => {
    setReport(next)
    // Each report has its own statuses: keep only the checked ones the new report also offers.
    setValues((current) => ({ ...current, status: current.status.filter((s) => STATUS_FILTERS[next].includes(s)) }))
    setPage(1)
  }
  const changeFilters = (next: ReportFilterValues) => {
    setValues(next)
    setPage(1)
  }
  const changePageSize = (next: number) => {
    setPageSize(next)
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
    toolbar: <ReportPicker reports={reports} value={report} onChange={changeReport} />,
    filters: (
      <ReportFilterPanel
        report={report}
        value={values}
        onChange={changeFilters}
        rangeError={rangeInvalid ? RANGE_ERROR : undefined}
      />
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
  const pageCount = Math.max(1, Math.ceil(data.total / pageSize))
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
          total={data.total}
          pageSize={pageSize}
          onPageSizeChange={changePageSize}
          pageSizeOptions={PAGE_SIZES}
        />
      }
    >
      <ReportRows page={data} />
    </ListPageTemplate>
  )
}
