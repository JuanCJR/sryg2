import { Link } from 'react-router'
import { Lamp, StatusBadge } from '../../../common/components'
import { personnelDetail } from '../../../routes'
import { formatRemaining } from '../utils/format'
import type { PersonnelListRow } from '../utils/types'
import clsx from '../../../common/utils/clsx'
import styles from './PersonnelTable.module.css'

export interface PersonnelTableProps {
  rows: PersonnelListRow[]
}

/**
 * Dense desktop/tablet table that becomes stacked phone rows at ≤480px (CSS only, same markup).
 * Columns follow the UI conventions: Cédula (ID), Nombre, Categoría (tipo), detail, days, Estado.
 */
export function PersonnelTable({ rows }: PersonnelTableProps) {
  return (
    <div className={styles.table}>
      <div className={styles.headerRow} aria-hidden="true">
        <span className={clsx(styles.headerCell, styles.colCedula)}>Cédula</span>
        <span className={styles.headerCell}>Nombre</span>
        <span className={clsx(styles.headerCell, styles.colCategoria)}>Categoría</span>
        <span className={clsx(styles.headerCell, styles.colCredencial)}>Credencial más crítica</span>
        <span className={clsx(styles.headerCell, styles.colRestante)}>Días restantes</span>
        <span className={styles.headerCell}>Estado</span>
      </div>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.id}>
            <Link to={personnelDetail(row.id)} className={styles.row}>
              <span className={clsx(styles.cedula, styles.colCedula)}>{row.cedula}</span>
              <span className={styles.nombre}>{row.nombre}</span>
              <span className={clsx(styles.categoria, styles.colCategoria)}>{row.categoria}</span>
              <span className={clsx(styles.credencial, styles.colCredencial)}>{row.credencialCritica ?? '—'}</span>
              <span className={clsx(styles.restante, styles.colRestante)}>
                {row.diasRestantes === null ? '—' : formatRemaining(row.diasRestantes)}
              </span>
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
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
