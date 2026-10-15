import { FolderOpen, LockOpen } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { ActionMenu, Lamp, TableFrame } from '../../../design-system'
import { personnelDetail } from '../../../app/routes'
import styles from './BlocksTable.module.css'

export interface BlockTableRow {
  id: string
  reference: string
  personalId: string
  personName: string
  cedula: string
  typeLabel: string
  reason: string
  active: boolean
  statusLabel: string
  registeredLabel: string
  /** Null while the block is active. */
  resolutionLabel: string | null
  canResolve: boolean
}

export interface BlocksTableProps {
  rows: BlockTableRow[]
  onResolve: (id: string) => void
}

/**
 * Dense table of blocks (/bloqueos), columns in the UI-conventions order: Referencia (ID), Persona,
 * Tipo, Motivo, Registro, Estado, Acciones. The lamp and the label carry the state, never color alone.
 */
export function BlocksTable({ rows, onResolve }: BlocksTableProps) {
  const navigate = useNavigate()
  return (
    <TableFrame>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Referencia</th>
            <th scope="col">Persona</th>
            <th scope="col">Tipo</th>
            <th scope="col">Motivo</th>
            <th scope="col">Registro</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className={styles.visuallyHidden}>Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Referencia" className={styles.reference}>
                {row.reference}
              </td>
              <td data-label="Persona">
                <Link to={personnelDetail(row.personalId)} className={styles.person}>
                  <span className={styles.personName}>{row.personName}</span>
                  <span className={styles.cedula}>{row.cedula}</span>
                </Link>
              </td>
              <td data-label="Tipo">{row.typeLabel}</td>
              <td data-label="Motivo">
                <span className={styles.reason}>{row.reason}</span>
                {row.resolutionLabel ? <span className={styles.meta}>{row.resolutionLabel}</span> : null}
              </td>
              <td data-label="Registro" className={styles.meta}>
                {row.registeredLabel}
              </td>
              <td data-label="Estado">
                <span className={styles.status}>
                  <Lamp status={row.active ? 'bloqueada' : 'activa'} />
                  {row.statusLabel}
                </span>
              </td>
              <td className={styles.actions}>
                <ActionMenu
                  label={`Acciones del bloqueo ${row.reference}`}
                  items={[
                    {
                      label: 'Ver expediente',
                      icon: FolderOpen,
                      onSelect: () => navigate(personnelDetail(row.personalId)),
                    },
                    ...(row.canResolve
                      ? [{ label: 'Resolver bloqueo', icon: LockOpen, onSelect: () => onResolve(row.id) }]
                      : []),
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  )
}
