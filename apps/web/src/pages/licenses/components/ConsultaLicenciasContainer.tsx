import { useState } from 'react'
import type { LicenseListItemDto } from '@sryg/types'
import { Breadcrumb, Pagination } from '../../../common/components'
import { PATHS, personnelDetail } from '../../../routes'
import { ListPageTemplate } from '../../../common/components/ListPageTemplate/ListPageTemplate'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { useDebouncedValue } from '../../../common/hooks/useDebouncedValue'
import { listLicenses, type LicenseListFilters } from '../services/licenses-client'
import { formatDate, formatExpiry } from '../utils/format'
import { toCredentialStatus } from '../utils/status'
import { LicenseFilters } from './LicenseFilters'
import { EMPTY_LICENSE_FILTERS, type LicenseFilterValues } from '../utils/filters'
import { LicensesTable, type LicenseListRow } from './LicensesTable'

const DEFAULT_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

const LOAD_ERROR = {
  title: 'No se pudieron cargar las licencias',
  message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
}

function toRow(item: LicenseListItemDto): LicenseListRow {
  return {
    id: item.id,
    href: `${personnelDetail(item.personalId)}?pagina=licencias`,
    estado: toCredentialStatus(item.status),
    cedula: item.person.cedula,
    nombre: `${item.person.firstNames} ${item.person.lastNames}`.trim(),
    tipo: item.licenseType.nameEs,
    numero: item.number,
    emitidaLabel: formatDate(item.issueDate),
    venceLabel: formatExpiry(item.expiryDate),
  }
}

/**
 * Consulta de licencias (`/licencias`) — the SLYM license query on `GET /api/licenses`, on the
 * List template: filter by applicant (names or cédula), number, type and expiry range, sorted by
 * expiry so the ones about to lapse come first.
 */
export function ConsultaLicenciasContainer() {
  const [values, setValues] = useState<LicenseFilterValues>(EMPTY_LICENSE_FILTERS)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const solicitante = useDebouncedValue(values.solicitante.trim(), SEARCH_DEBOUNCE_MS)
  const numero = useDebouncedValue(values.numero.trim(), SEARCH_DEBOUNCE_MS)

  const filters: Omit<LicenseListFilters, 'page' | 'pageSize'> = {
    q: solicitante || undefined,
    number: numero || undefined,
    licenseTypeId: values.tipo?.id,
    expiryFrom: values.venceDesde || undefined,
    expiryTo: values.venceHasta || undefined,
  }
  const invalidRange = Boolean(filters.expiryFrom && filters.expiryTo && filters.expiryFrom > filters.expiryTo)
  const filtered = Object.values(filters).some(Boolean)
  // An inverted range is not sent: the API would refuse it (400).
  const results = useApiResource(invalidRange ? null : `licenses:${JSON.stringify(filters)}:${page}:${pageSize}`, () =>
    listLicenses({ ...filters, page, pageSize }),
  )

  const handleChange = (patch: Partial<LicenseFilterValues>) => {
    setValues((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  const breadcrumb = <Breadcrumb items={[{ label: 'Inicio', href: PATHS.panel }, { label: 'Licencias' }]} />
  const common = {
    title: 'Consulta de licencias',
    breadcrumb,
    filters: <LicenseFilters values={values} onChange={handleChange} />,
  }

  if (invalidRange) {
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        empty={{
          reason: 'no-results',
          title: 'Rango de vencimiento inválido',
          message: '“Vence desde” es posterior a “Vence hasta”. Corrija las fechas.',
        }}
      />
    )
  }
  if (results.status === 'loading') {
    return <ListPageTemplate {...common} status="loading" loadingLabel="Buscando licencias" />
  }
  if (results.status === 'error') {
    return <ListPageTemplate {...common} status="error" error={{ ...LOAD_ERROR, onRetry: results.retry }} />
  }

  const { data } = results
  if (data.total === 0) {
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        empty={
          filtered
            ? {
                reason: 'no-results',
                title: 'Sin resultados para estos filtros',
                message: 'Ninguna licencia coincide con el solicitante, el número, el tipo o el rango de vencimiento.',
              }
            : {
                reason: 'no-data',
                title: 'Aún no hay licencias emitidas',
                message: 'Cuando se emita la primera licencia aparecerá aquí.',
              }
        }
      />
    )
  }

  const pageCount = Math.max(1, Math.ceil(data.total / pageSize))
  const handlePageSizeChange = (next: number) => {
    setPageSize(next)
    setPage(1)
  }
  return (
    <ListPageTemplate
      {...common}
      status="ready"
      summary={
        <p>
          {data.total} {data.total === 1 ? 'licencia' : 'licencias'}
        </p>
      }
      pagination={
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          total={data.total}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      }
    >
      <LicensesTable rows={data.items.map(toRow)} />
    </ListPageTemplate>
  )
}
