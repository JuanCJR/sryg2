import { useState } from 'react'
import { Button, Lamp, Pagination } from '../../../design-system'
import { useClientPagination } from '../../../shared/hooks/useClientPagination'
import styles from './BloqueosPanel.module.css'

export interface BloqueoRowView {
  id: string
  referencia: string
  tipo: string
  motivo: string
  registradoLabel: string
  estado: 'abierto' | 'resuelto'
  detieneLabel: string
  /** Null while the block is open. */
  resolucionLabel: string | null
  canResolve: boolean
}

export interface BloqueosPanelProps {
  rows: BloqueoRowView[]
  onResolve: (id: string) => void
}

type Filter = 'abiertos' | 'resueltos' | 'todos'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'abiertos', label: 'Abiertos' },
  { id: 'resueltos', label: 'Resueltos' },
  { id: 'todos', label: 'Todos' },
]

export function BloqueosPanel({ rows, onResolve }: BloqueosPanelProps) {
  const [filter, setFilter] = useState<Filter>('abiertos')
  const visible = rows.filter((row) => {
    if (filter === 'todos') return true
    if (filter === 'abiertos') return row.estado === 'abierto'
    return row.estado === 'resuelto'
  })
  const pages = useClientPagination(visible)

  const changeFilter = (next: Filter) => {
    setFilter(next)
    pages.setPage(1)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filters} role="group" aria-label="Filtrar bloqueos">
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={styles.filterKey}
            aria-pressed={filter === option.id}
            onClick={() => changeFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className={styles.list}>
        {visible.length === 0 ? (
          <p className={styles.empty}>Sin bloqueos para este filtro.</p>
        ) : (
          pages.pageItems.map((row) => (
            <div key={row.id} className={styles.row}>
              <Lamp status={row.estado === 'abierto' ? 'bloqueada' : 'activa'} size="md" />
              <span className={styles.id}>{row.referencia}</span>
              <div className={styles.body}>
                <span className={styles.motivo}>
                  {row.tipo} — {row.motivo}
                </span>
                <span className={styles.meta}>{row.registradoLabel}</span>
                {row.estado === 'abierto' ? <span className={styles.detiene}>Detiene: {row.detieneLabel}</span> : null}
                {row.resolucionLabel ? <span className={styles.meta}>{row.resolucionLabel}</span> : null}
              </div>
              {row.canResolve ? (
                <Button variant="secondary" onClick={() => onResolve(row.id)}>
                  Resolver bloqueo
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
      {pages.total > 0 ? (
        <Pagination
          page={pages.page}
          pageCount={pages.pageCount}
          onPageChange={pages.setPage}
          total={pages.total}
          pageSize={pages.pageSize}
          onPageSizeChange={pages.setPageSize}
        />
      ) : null}
    </div>
  )
}
