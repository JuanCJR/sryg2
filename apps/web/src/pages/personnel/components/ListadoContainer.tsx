import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Breadcrumb, Button, Pagination } from '../../../common/components'
import { useRole } from '../../../common/hooks/useRole'
import { PATHS } from '../../../routes'
import { ListPageTemplate } from '../../../common/components/ListPageTemplate/ListPageTemplate'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { useDebouncedValue } from '../../../common/hooks/useDebouncedValue'
import { listPersonnel } from '../services/personnel-client'
import { toListRow } from '../utils/person-view'
import { PersonnelAnnunciator, type PersonnelAnnunciatorCounts } from './PersonnelAnnunciator'
import { PersonnelIdleHint } from './PersonnelIdleHint'
import { PersonnelSearchField } from './PersonnelSearchField'
import { PersonnelTable } from './PersonnelTable'

const DEFAULT_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300
const EMPTY_COUNTS: PersonnelAnnunciatorCounts = { activa: 0, proxima: 0, vencida: 0, bloqueada: 0 }

const LOAD_ERROR = {
  title: 'No se pudo cargar el personal',
  message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
}

/**
 * Listado de personal — the List direction's reference page ("Lookup console with annunciator
 * panel"), on `GET /api/personnel`. The registry is never shown unfiltered: the page first checks
 * whether it holds anyone (for the empty state), then searches by name or cédula on the server.
 * The annunciator stays unlit ("Próximamente") until the API exposes credential statuses.
 */
export function ListadoContainer() {
  const { can } = useRole()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const term = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)

  // pageSize=1: only the total matters here (empty registry vs. idle console).
  const registry = useApiResource('personnel:total', () => listPersonnel({ page: 1, pageSize: 1 }))
  const results = useApiResource(term ? `personnel:${term}:${page}:${pageSize}` : null, () =>
    listPersonnel({ q: term, page, pageSize }),
  )

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  const handlePageSizeChange = (next: number) => {
    setPageSize(next)
    setPage(1)
  }

  const breadcrumb = <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Personal' }]} />
  const primaryAction = can('personnel', 'write') ? (
    <Button variant="primary" onClick={() => navigate(PATHS.personnelNew)}>
      Nuevo personal
    </Button>
  ) : undefined
  const common = { title: 'Personal', breadcrumb, primaryAction }
  const toolbar = <PersonnelSearchField value={query} onChange={handleQueryChange} />

  if (registry.status === 'error') {
    return (
      <ListPageTemplate
        {...common}
        status="error"
        toolbar={<PersonnelSearchField value={query} onChange={handleQueryChange} disabled />}
        error={{ ...LOAD_ERROR, onRetry: registry.retry }}
      />
    )
  }

  const summary = (
    <PersonnelAnnunciator
      counts={EMPTY_COUNTS}
      selected={null}
      onToggle={() => {}}
      loading={registry.status === 'loading'}
      unavailable={registry.status === 'ready'}
    />
  )

  if (registry.status === 'loading') {
    return (
      <ListPageTemplate
        {...common}
        status="loading"
        toolbar={toolbar}
        summary={summary}
        loadingLabel="Cargando personal"
      />
    )
  }

  if (registry.data.total === 0) {
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        toolbar={toolbar}
        summary={summary}
        empty={{
          reason: 'no-data',
          title: 'Aún no hay personal registrado',
          message: 'Cuando se registre la primera persona aparecerá aquí.',
        }}
      />
    )
  }

  if (!term) {
    return (
      <ListPageTemplate {...common} status="ready" toolbar={toolbar} summary={summary}>
        <PersonnelIdleHint />
      </ListPageTemplate>
    )
  }

  if (results.status === 'loading') {
    return (
      <ListPageTemplate
        {...common}
        status="loading"
        toolbar={toolbar}
        summary={summary}
        loadingLabel="Buscando personal"
      />
    )
  }

  if (results.status === 'error') {
    return (
      <ListPageTemplate
        {...common}
        status="error"
        toolbar={toolbar}
        error={{ ...LOAD_ERROR, onRetry: results.retry }}
      />
    )
  }

  if (results.data.total === 0) {
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        toolbar={toolbar}
        summary={summary}
        empty={{
          reason: 'no-results',
          title: 'Sin resultados para esta búsqueda',
          message: 'Ninguna persona coincide con el nombre o la cédula escritos.',
        }}
      />
    )
  }

  const pageCount = Math.max(1, Math.ceil(results.data.total / pageSize))
  return (
    <ListPageTemplate
      {...common}
      status="ready"
      toolbar={toolbar}
      summary={summary}
      pagination={
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          total={results.data.total}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
        />
      }
    >
      <PersonnelTable rows={results.data.items.map(toListRow)} />
    </ListPageTemplate>
  )
}
