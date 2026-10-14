import { useState } from 'react'
import { Breadcrumb, Pagination } from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { ListPageTemplate } from '../../../app/templates/ListPageTemplate'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { BlocksFilters, type BlocksFilterValues } from '../components/BlocksFilters'
import { BlocksTable, type BlockTableRow } from '../components/BlocksTable'
import { useBlocks } from '../hooks/useBlocks'
import { useResolveBlock } from '../hooks/useResolveBlock'
import {
  BLOCK_STATUS_LABEL,
  BLOCK_TYPE_LABEL,
  blockReference,
  personName,
  registeredLabel,
  resolutionLabel,
} from '../domain/block-view'

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300
// The working view: what is stopping credentials right now.
const DEFAULT_FILTERS: BlocksFilterValues = { status: 'activo', type: '', person: '' }

const LOAD_ERROR = {
  title: 'No se pudieron cargar los bloqueos',
  message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
}

/**
 * Bloqueos (page 8, VAL-03) on `GET /api/blocks`: every role reads, filtered by status, type and
 * person; the Admin and Supervisors resolve (D2). Blocks are registered from the person's Expediente,
 * where the person is already identified.
 */
export function BloqueosListContainer() {
  const { can } = useRole()
  const canWrite = can('blocking', 'write')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const person = useDebouncedValue(filters.person.trim(), SEARCH_DEBOUNCE_MS)
  const resolveFlow = useResolveBlock()

  const blocks = useBlocks({
    status: filters.status || undefined,
    type: filters.type || undefined,
    q: person || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const handleFilters = (next: BlocksFilterValues) => {
    setFilters(next)
    setPage(1)
  }

  const common = {
    title: 'Bloqueos',
    breadcrumb: <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Bloqueos' }]} />,
    overlays: resolveFlow.dialog,
  }

  if (blocks.status === 'error') {
    return (
      <ListPageTemplate
        {...common}
        status="error"
        toolbar={<BlocksFilters values={filters} onChange={handleFilters} disabled />}
        error={{ ...LOAD_ERROR, onRetry: blocks.retry }}
      />
    )
  }

  const toolbar = <BlocksFilters values={filters} onChange={handleFilters} />

  if (blocks.status === 'loading') {
    return <ListPageTemplate {...common} status="loading" toolbar={toolbar} loadingLabel="Cargando bloqueos" />
  }

  const { items, total } = blocks.data
  if (total === 0) {
    const unfiltered = filters.status === 'activo' && !filters.type && !person
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        toolbar={toolbar}
        empty={
          unfiltered
            ? {
                reason: 'no-data',
                title: 'No hay bloqueos activos',
                message: 'Ninguna persona tiene la emisión de credenciales detenida.',
              }
            : {
                reason: 'no-results',
                title: 'Ningún bloqueo coincide con los filtros',
                message: 'Cambie el estado, el tipo o la persona.',
              }
        }
      />
    )
  }

  const rows: BlockTableRow[] = items.map((block) => ({
    id: block.id,
    reference: blockReference(block.id),
    personalId: block.personalId,
    personName: personName(block),
    cedula: block.person.cedula,
    typeLabel: BLOCK_TYPE_LABEL[block.type],
    reason: block.reason,
    active: block.status === 'activo',
    statusLabel: BLOCK_STATUS_LABEL[block.status],
    registeredLabel: registeredLabel(block),
    resolutionLabel: resolutionLabel(block),
    canResolve: canWrite && block.status === 'activo',
  }))
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <ListPageTemplate
      {...common}
      status="ready"
      toolbar={toolbar}
      summary={
        <p>
          {total} {total === 1 ? 'bloqueo' : 'bloqueos'}
        </p>
      }
      pagination={pageCount > 1 ? <Pagination page={page} pageCount={pageCount} onPageChange={setPage} /> : undefined}
    >
      <BlocksTable
        rows={rows}
        onResolve={(id) => {
          const target = items.find((block) => block.id === id)
          if (target) resolveFlow.start(target)
        }}
      />
    </ListPageTemplate>
  )
}
