import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Breadcrumb, Button, Pagination } from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { PATHS } from '../../../app/routes'
import { ListPageTemplate } from '../../../app/templates/ListPageTemplate'
import { useApiResource } from '../../../shared/api/useApiResource'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { listPersonnel } from '../data/personnel-client'
import { toListRow } from '../domain/person-view'
import { PersonnelAnnunciator, type PersonnelAnnunciatorCounts } from '../components/PersonnelAnnunciator'
import { PersonnelIdleHint } from '../components/PersonnelIdleHint'
import { PersonnelSearchField } from '../components/PersonnelSearchField'
import { PersonnelTable } from '../components/PersonnelTable'

const PAGE_SIZE = 25
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
  const term = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)

  // pageSize=1: only the total matters here (empty registry vs. idle console).
  const registry = useApiResource('personnel:total', () => listPersonnel({ page: 1, pageSize: 1 }))
  const results = useApiResource(term ? `personnel:${term}:${page}` : null, () =>
    listPersonnel({ q: term, page, pageSize: PAGE_SIZE }),
  )

  const handleQueryChange = (value: string) => {
    setQuery(value)
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

  const pageCount = Math.max(1, Math.ceil(results.data.total / PAGE_SIZE))
  return (
    <ListPageTemplate
      {...common}
      status="ready"
      toolbar={toolbar}
      summary={summary}
      pagination={pageCount > 1 ? <Pagination page={page} pageCount={pageCount} onPageChange={setPage} /> : undefined}
    >
      <PersonnelTable rows={results.data.items.map(toListRow)} />
    </ListPageTemplate>
  )
}
