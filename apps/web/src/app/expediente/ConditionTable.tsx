import { Lock } from 'lucide-react'
import { Icon, StatusBadge, TableFrame, type CredentialStatus } from '../../design-system'
import clsx from '../../lib/clsx'
import styles from './ConditionTable.module.css'

export interface ConditionRow {
  id: string
  status: CredentialStatus
  nombre: string
  numero?: string
  emitidaLabel: string
  venceLabel: string
  restanteLabel: string
  /** Adds a secondary marker/hatch only — Estado keeps showing the credential's own status, never replaced. */
  blockedMarker?: string
  /** Médico only: the operational restriction, shown in its own "Restricciones" column. */
  restriccionLabel?: string
}

export interface ConditionTableProps {
  caption: string
  groupLabel?: string
  rows: ConditionRow[]
  highlightedId?: string | null
  /** Changes on every warning selection (even re-selecting the same row) to restart the sweep. */
  highlightNonce?: number
  emptyLabel?: string
  /** Habilitaciones and Médico have no Número data — omit the column entirely rather than show it empty. */
  hideNumero?: boolean
  /** Médico's operational-restriction column header — presence of this prop adds the column. */
  restriccionesHeader?: string
}

function NombreCell({ row }: { row: ConditionRow }) {
  return (
    <span className={styles.nombreCell}>
      <span className={styles.nombre}>{row.nombre}</span>
      {row.blockedMarker ? (
        <span className={styles.blockedMarker}>
          <Icon icon={Lock} size={16} />
          {row.blockedMarker}
        </span>
      ) : null}
    </span>
  )
}

/**
 * A responsive "table" (div-based, role=table) shared by Licencias, Habilitaciones, and Médico.
 * Columns follow the UI convention: Número (ID), Nombre (the credential's type), Restricciones
 * (detail), Emitida, Vence, Restante, then Estado last.
 */
export function ConditionTable({
  caption,
  groupLabel,
  rows,
  highlightedId,
  highlightNonce,
  emptyLabel = 'Sin registros.',
  hideNumero = false,
  restriccionesHeader,
}: ConditionTableProps) {
  const showRestricciones = Boolean(restriccionesHeader)
  const gridClass = showRestricciones
    ? styles.gridWithRestricciones
    : hideNumero
      ? styles.gridNoNumero
      : styles.gridFull

  return (
    <TableFrame>
      <div className={styles.table} role="table" aria-label={caption}>
        {groupLabel ? <div className={styles.groupHeader}>{groupLabel}</div> : null}
        <div className={clsx(styles.headerRow, gridClass)} role="row">
          {hideNumero ? null : (
            <span className={clsx(styles.headerCell, styles.colNumero)} role="columnheader">
              Número
            </span>
          )}
          <span className={styles.headerCell} role="columnheader">
            Nombre
          </span>
          {showRestricciones ? (
            <span className={styles.headerCell} role="columnheader">
              {restriccionesHeader}
            </span>
          ) : null}
          <span className={clsx(styles.headerCell, styles.colEmitida)} role="columnheader">
            Emitida
          </span>
          <span className={styles.headerCell} role="columnheader">
            Vence
          </span>
          <span className={clsx(styles.headerCell, styles.headerRestante)} role="columnheader">
            Restante
          </span>
          <span className={styles.headerCell} role="columnheader">
            Estado
          </span>
        </div>
        {rows.length === 0 ? (
          <p className={styles.empty}>{emptyLabel}</p>
        ) : (
          rows.map((row) => {
            const isHighlighted = highlightedId === row.id
            return (
              <div
                key={row.id}
                id={`row-${row.id}`}
                data-row-id={row.id}
                tabIndex={-1}
                role="row"
                className={clsx(
                  styles.row,
                  gridClass,
                  row.blockedMarker && styles.blocked,
                  isHighlighted && styles.rowHighlighted,
                )}
              >
                {/* Keyed by nonce, not just row id, so re-selecting the same row remounts and restarts the animation. */}
                {isHighlighted && highlightNonce != null ? (
                  <span key={`sweep-${row.id}-${highlightNonce}`} className={styles.sweepOverlay} aria-hidden="true" />
                ) : null}
                <div className={styles.gridRow}>
                  {hideNumero ? null : (
                    <span role="cell" className={styles.numero}>
                      {row.numero}
                    </span>
                  )}
                  <span role="cell">
                    <NombreCell row={row} />
                  </span>
                  {showRestricciones ? (
                    <span role="cell" className={styles.restriccion}>
                      {row.restriccionLabel}
                    </span>
                  ) : null}
                  <span role="cell" className={styles.emitida}>
                    {row.emitidaLabel}
                  </span>
                  <span role="cell" className={styles.vence}>
                    {row.venceLabel}
                  </span>
                  <span role="cell" className={styles.restante}>
                    {row.restanteLabel}
                  </span>
                  <span role="cell">
                    <StatusBadge status={row.status} />
                  </span>
                </div>
                <div className={styles.phoneRow}>
                  <div className={styles.phoneTop}>
                    <StatusBadge status={row.status} />
                    <NombreCell row={row} />
                  </div>
                  {row.restriccionLabel ? (
                    <span className={styles.phoneRestriccion}>
                      {restriccionesHeader}: {row.restriccionLabel}
                    </span>
                  ) : null}
                  <div className={styles.phoneBottom}>
                    <span className={styles.vence}>Vence {row.venceLabel}</span>
                    <span className={styles.restante}>{row.restanteLabel}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </TableFrame>
  )
}
