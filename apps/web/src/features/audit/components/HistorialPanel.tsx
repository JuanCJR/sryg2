import { useMemo, useState } from 'react'
import { DateInput, Label, Pagination, Select } from '../../../design-system'
import type { AuditEntry } from '../domain/types'
import { formatDateTime } from '../domain/format'
import styles from './HistorialPanel.module.css'

export interface HistorialPanelProps {
  entries: AuditEntry[]
}

const PAGE_SIZE = 8
const ENTITIES: AuditEntry['entidad'][] = ['Personal', 'Licencia', 'Habilitación', 'Certificado médico', 'Bloqueo']

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10)
}

export function HistorialPanel({ entries }: HistorialPanelProps) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [entidad, setEntidad] = useState('todas')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = toDateInputValue(entry.fecha)
      if (desde && entryDate < desde) return false
      if (hasta && entryDate > hasta) return false
      if (entidad !== 'todas' && entry.entidad !== entidad) return false
      return true
    })
  }, [entries, desde, hasta, entidad])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const updateFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        <div className={styles.field}>
          <Label htmlFor="historial-desde">Desde</Label>
          <DateInput id="historial-desde" value={desde} onChange={(e) => updateFilter(setDesde)(e.target.value)} />
        </div>
        <div className={styles.field}>
          <Label htmlFor="historial-hasta">Hasta</Label>
          <DateInput id="historial-hasta" value={hasta} onChange={(e) => updateFilter(setHasta)(e.target.value)} />
        </div>
        <div className={styles.field}>
          <Label htmlFor="historial-entidad">Entidad</Label>
          <Select id="historial-entidad" value={entidad} onChange={(e) => updateFilter(setEntidad)(e.target.value)}>
            <option value="todas">Todas</option>
            {ENTITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className={styles.table} role="table" aria-label="Historial de auditoría">
        <div className={styles.headerRow} role="row">
          <span className={styles.headerCell} role="columnheader">
            Fecha y hora
          </span>
          <span className={styles.headerCell} role="columnheader">
            Actor
          </span>
          <span className={styles.headerCell} role="columnheader">
            Acción
          </span>
          <span className={styles.headerCell} role="columnheader">
            Entidad
          </span>
          <span className={styles.headerCell} role="columnheader">
            Detalle
          </span>
        </div>
        {pageRows.length === 0 ? (
          <p className={styles.empty}>Sin registros para estos filtros.</p>
        ) : (
          pageRows.map((entry) => (
            <div key={entry.id} className={styles.row} role="row">
              <span role="cell" className={styles.fecha}>
                {formatDateTime(entry.fecha)}
              </span>
              <span role="cell" className={styles.cell}>
                {entry.actor}
              </span>
              <span role="cell" className={styles.cell}>
                {entry.accion}
              </span>
              <span role="cell" className={styles.cell}>
                {entry.entidad}
              </span>
              <span role="cell" className={styles.cell}>
                {entry.detalle}
              </span>
            </div>
          ))
        )}
      </div>

      {filtered.length > 0 ? (
        <div className={styles.footer}>
          <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} />
        </div>
      ) : null}
    </div>
  )
}
