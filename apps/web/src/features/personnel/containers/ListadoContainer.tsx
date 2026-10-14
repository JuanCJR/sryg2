import { useMemo, useState } from 'react'
import { Breadcrumb, Button, Pagination, useToast, type CredentialStatus } from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { useDemoToday } from '../../../demo/clock'
import { useDemoStateOverride } from '../../../demo/useDemoStateOverride'
import { useDemoResource } from '../../../demo/useDemoResource'
import { ListPageTemplate } from '../../../app/templates/ListPageTemplate'
import { buildPersonnelListRows } from '../data/demoData'
import type { PersonnelListRow } from '../domain/types'
import { PersonnelAnnunciator, type PersonnelAnnunciatorCounts } from '../components/PersonnelAnnunciator'
import { PersonnelIdleHint } from '../components/PersonnelIdleHint'
import { PersonnelSearchField } from '../components/PersonnelSearchField'
import { PersonnelTable } from '../components/PersonnelTable'

const PAGE_SIZE = 25
const EMPTY_COUNTS: PersonnelAnnunciatorCounts = { activa: 0, proxima: 0, vencida: 0, bloqueada: 0 }

function countByStatus(rows: PersonnelListRow[]): PersonnelAnnunciatorCounts {
  const counts: PersonnelAnnunciatorCounts = { ...EMPTY_COUNTS }
  for (const row of rows) {
    counts[row.estado] += 1
  }
  return counts
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Listado de personal — the List direction's reference page ("Lookup console with annunciator
 * panel"). Owns search, the annunciator's signature lamp-filter interaction, role-gated create
 * action, `?estado=` demo states, and pagination; content is composed on `ListPageTemplate`.
 */
export function ListadoContainer() {
  const { can } = useRole()
  const toast = useToast()
  const today = useDemoToday()
  const estadoOverride = useDemoStateOverride(['cargando', 'error', 'vacio'] as const)

  const [query, setQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<CredentialStatus | null>(null)
  const [page, setPage] = useState(1)

  const resource = useDemoResource('personnel-list', () => buildPersonnelListRows(today), {
    forceLoading: estadoOverride === 'cargando',
    forceError: estadoOverride === 'error',
  })

  const allRows = useMemo(() => (resource.status === 'ready' ? resource.data : []), [resource])
  const normalizedQuery = normalize(query)
  const forcedEmpty = estadoOverride === 'vacio'
  // The registry holds thousands of people (List direction brief): rows appear only once a
  // query or a lamp is active, never as an unfiltered grid on arrival.
  const isFilterActive = Boolean(selectedStatus) || Boolean(normalizedQuery)
  // The ?estado=vacio demo state simulates an empty registry — the annunciator's totals must agree.
  const counts = useMemo(() => (forcedEmpty ? EMPTY_COUNTS : countByStatus(allRows)), [allRows, forcedEmpty])

  const filteredRows = useMemo(() => {
    if (forcedEmpty || !isFilterActive) {
      return []
    }
    let rows = allRows
    if (selectedStatus) {
      rows = rows.filter((row) => row.estado === selectedStatus)
    }
    if (normalizedQuery) {
      rows = rows.filter(
        (row) => normalize(row.nombre).includes(normalizedQuery) || normalize(row.cedula).includes(normalizedQuery),
      )
    }
    // Signature interaction (List direction brief): sorted by days remaining, most urgent first —
    // the "departure-board raise" — whenever a lamp or a query filter is active.
    return [...rows].sort((a, b) => a.diasRestantes - b.diasRestantes)
  }, [allRows, selectedStatus, normalizedQuery, forcedEmpty, isFilterActive])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleToggleStatus = (status: CredentialStatus) => {
    setSelectedStatus((current) => (current === status ? null : status))
    setPage(1)
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  const canCreate = can('personnel:write')

  // "Inicio / Personal" rather than a bare "Personal" crumb, so it never reads as a stutter under the page's own H1.
  const breadcrumb = <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Personal' }]} />
  const primaryAction = canCreate ? (
    <Button
      variant="primary"
      onClick={() =>
        toast.show({
          tone: 'info',
          message: 'Acción de demostración: Nuevo personal (el Registro llega en una fase posterior).',
        })
      }
    >
      Nuevo personal
    </Button>
  ) : undefined

  if (resource.status === 'loading') {
    // Chrome (title, primaryAction, toolbar) and a placeholder annunciator stay in place so
    // nothing reflows once the registry resolves.
    return (
      <ListPageTemplate
        status="loading"
        title="Personal"
        breadcrumb={breadcrumb}
        primaryAction={primaryAction}
        toolbar={<PersonnelSearchField value={query} onChange={handleQueryChange} />}
        summary={<PersonnelAnnunciator counts={EMPTY_COUNTS} selected={null} onToggle={() => {}} loading />}
        loadingLabel="Cargando personal"
      />
    )
  }

  if (resource.status === 'error') {
    return (
      <ListPageTemplate
        status="error"
        title="Personal"
        breadcrumb={breadcrumb}
        primaryAction={primaryAction}
        toolbar={<PersonnelSearchField value={query} onChange={handleQueryChange} disabled />}
        error={{
          title: 'No se pudo cargar el personal',
          message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
          onRetry: resource.retry,
        }}
      />
    )
  }

  const summary = <PersonnelAnnunciator counts={counts} selected={selectedStatus} onToggle={handleToggleStatus} />
  const toolbar = <PersonnelSearchField value={query} onChange={handleQueryChange} />

  if (forcedEmpty) {
    return (
      <ListPageTemplate
        status="empty"
        title="Personal"
        breadcrumb={breadcrumb}
        primaryAction={primaryAction}
        toolbar={toolbar}
        summary={summary}
        empty={{
          reason: 'no-data',
          title: 'Aún no hay personal registrado',
          message: 'No hay registros de personal en esta demostración.',
        }}
      />
    )
  }

  if (!isFilterActive) {
    return (
      <ListPageTemplate
        status="ready"
        title="Personal"
        breadcrumb={breadcrumb}
        primaryAction={primaryAction}
        toolbar={toolbar}
        summary={summary}
      >
        <PersonnelIdleHint />
      </ListPageTemplate>
    )
  }

  if (filteredRows.length === 0) {
    return (
      <ListPageTemplate
        status="empty"
        title="Personal"
        breadcrumb={breadcrumb}
        primaryAction={primaryAction}
        toolbar={toolbar}
        summary={summary}
        empty={{
          reason: 'no-results',
          title: 'Sin resultados para este filtro',
          message: 'Ninguna persona coincide con la búsqueda o el estado seleccionado.',
        }}
      />
    )
  }

  return (
    <ListPageTemplate
      status="ready"
      title="Personal"
      breadcrumb={breadcrumb}
      primaryAction={primaryAction}
      toolbar={toolbar}
      summary={summary}
      pagination={
        pageCount > 1 ? <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} /> : undefined
      }
    >
      <PersonnelTable rows={pageRows} />
    </ListPageTemplate>
  )
}
