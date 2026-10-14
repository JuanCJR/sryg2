import { Link } from 'react-router'
import { Lamp, StatusBadge } from '../../../design-system'
import { personnelDetail } from '../../../app/routes'
import { formatRemaining } from '../domain/format'
import type { PersonnelListRow } from '../domain/types'
import clsx from '../../../lib/clsx'
import styles from './PersonnelTable.module.css'

export interface PersonnelTableProps {
  rows: PersonnelListRow[]
}

/** Dense desktop/tablet table that becomes stacked phone rows at ≤480px (CSS only, same markup). */
export function PersonnelTable({ rows }: PersonnelTableProps) {
  return (
    <div className={styles.table}>
      <div className={styles.headerRow} aria-hidden="true">
        <span className={styles.headerCell}>Estado</span>
        <span className={clsx(styles.headerCell, styles.colCedula)}>Cédula</span>
        <span className={styles.headerCell}>Nombre</span>
        <span className={clsx(styles.headerCell, styles.colCategoria)}>Categoría</span>
        <span className={clsx(styles.headerCell, styles.colCredencial)}>Credencial más crítica</span>
        <span className={clsx(styles.headerCell, styles.colRestante)}>Días restantes</span>
      </div>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={personnelDetail(row.id)} className={styles.row}>
              <span className={styles.estado}>
                {row.estado ? (
                  <StatusBadge status={row.estado} />
                ) : (
                  <span className={styles.sinDatos}>
                    <Lamp status="sin-datos" />
                    Sin datos
                  </span>
                )}
              </span>
              <span className={clsx(styles.cedula, styles.colCedula)}>{row.cedula}</span>
              <span className={styles.nombre}>{row.nombre}</span>
              <span className={clsx(styles.categoria, styles.colCategoria)}>{row.categoria}</span>
              <span className={clsx(styles.credencial, styles.colCredencial)}>{row.credencialCritica ?? '—'}</span>
              <span className={clsx(styles.restante, styles.colRestante)}>
                {row.diasRestantes === null ? '—' : formatRemaining(row.diasRestantes)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
