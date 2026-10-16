import { CheckCheck, FolderOpen } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { Alert } from '@sryg/types'
import { ActionMenu, StatusBadge, TableFrame } from '../../../common/components'
import { personnelDetail } from '../../../routes'
import clsx from '../../../common/utils/clsx'
import { formatTime } from '../utils/format-time'
import { formatDueDate, formatRemaining } from '../utils/alert-view'
import { AREA_LABELS, CREDENTIAL_KIND_LABELS } from '../utils/labels'
import styles from './AlertList.module.css'

export interface AlertListProps {
  alerts: Alert[]
  today: Date
  /** Present when the user may acknowledge (ALR-06); without it no action is shown. */
  onAcknowledge?: (alert: Alert) => void
  /** The alert whose acknowledgement is in flight. */
  pendingId?: string | null
}

const holderOf = (alert: Alert) => `${alert.personnel.firstNames} ${alert.personnel.lastNames}`

/**
 * Dense list of expiry alerts, most urgent first (the API orders by due date); stacked rows on phone.
 * Columns follow the UI conventions: Cédula (ID), Titular, Credencial (tipo), Área, Vencimiento,
 * Estado, then the Reconocimiento action.
 */
export function AlertList({ alerts, today, onAcknowledge, pendingId = null }: AlertListProps) {
  const navigate = useNavigate()
  return (
    <TableFrame>
      <div className={styles.table}>
        <div className={styles.headerRow} data-table-head aria-hidden="true">
          <span className={styles.headerCell}>Cédula</span>
          <span className={styles.headerCell}>Titular</span>
          <span className={styles.headerCell}>Credencial</span>
          <span className={clsx(styles.headerCell, styles.colArea)}>Área</span>
          <span className={styles.headerCell}>Vencimiento</span>
          <span className={styles.headerCell}>Estado</span>
          <span className={clsx(styles.headerCell, styles.colAction)}>Reconocimiento</span>
        </div>
        <ul className={styles.list} aria-label="Alertas de vencimiento">
          {alerts.map((alert) => {
            const credential = CREDENTIAL_KIND_LABELS[alert.credentialKind]
            const holder = holderOf(alert)
            return (
              <li key={alert.id} className={styles.row}>
                <span className={styles.cedula}>{alert.personnel.cedula}</span>
                <span className={styles.titular}>
                  <Link to={personnelDetail(alert.personalId)} className={styles.nombre}>
                    {holder}
                  </Link>
                </span>
                <span className={styles.credencial}>{credential}</span>
                <span className={clsx(styles.area, styles.colArea)}>{AREA_LABELS[alert.area]}</span>
                <span className={styles.vencimiento}>
                  <span className={styles.fecha}>{formatDueDate(alert.dueDate)}</span>
                  <span className={styles.restante}>{formatRemaining(alert.dueDate, today)}</span>
                </span>
                <span className={styles.estado}>
                  <StatusBadge status={alert.kind === 'vencida' ? 'vencida' : 'proxima'} />
                </span>
                <span className={clsx(styles.accion, styles.colAction)}>
                  {alert.acknowledgedAt ? (
                    <span className={styles.reconocida}>Reconocida el {formatTime(alert.acknowledgedAt)}</span>
                  ) : onAcknowledge ? (
                    <ActionMenu
                      label={`Acciones de la alerta de ${credential} de ${holder}`}
                      busy={pendingId === alert.id}
                      items={[
                        {
                          label: 'Reconocer alerta',
                          icon: CheckCheck,
                          disabled: pendingId !== null,
                          onSelect: () => onAcknowledge(alert),
                        },
                        {
                          label: 'Ver expediente',
                          icon: FolderOpen,
                          onSelect: () => navigate(personnelDetail(alert.personalId)),
                        },
                      ]}
                    />
                  ) : (
                    <span className={styles.reconocida}>Pendiente</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </TableFrame>
  )
}
