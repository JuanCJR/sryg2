import { KeyRound, Pencil, UserCheck, UserX } from 'lucide-react'
import type { ManagedUser } from '@sryg/types'
import { ActionMenu, Lamp, TableFrame } from '../../../design-system'
import { AREA_LABEL, ROLE_LABEL } from '../../../app/role/labels'
import styles from './UsersTable.module.css'

export interface UsersTableProps {
  users: ManagedUser[]
  onEdit: (user: ManagedUser) => void
  onResetPassword: (user: ManagedUser) => void
  onToggleActive: (user: ManagedUser) => void
}

/**
 * Users with their role, area and state, and the Admin's actions on each row (AUTH-06). Columns follow
 * the UI conventions: Correo (ID), Nombre (persona), Rol (tipo), Área, Estado, actions.
 */
export function UsersTable({ users, onEdit, onResetPassword, onToggleActive }: UsersTableProps) {
  return (
    <TableFrame>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Correo</th>
            <th scope="col">Nombre</th>
            <th scope="col">Rol</th>
            <th scope="col">Área</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className={user.isActive ? undefined : styles.inactive}>
              <td className={styles.email}>{user.email}</td>
              <td className={styles.name}>{user.fullName}</td>
              <td>{ROLE_LABEL[user.role]}</td>
              <td>{AREA_LABEL[user.area]}</td>
              <td>
                <span className={styles.state}>
                  <Lamp status={user.isActive ? 'activa' : 'sin-datos'} size="sm" />
                  {user.isActive ? 'Activo' : 'Inactivo'}
                </span>
                {user.mustChangePassword ? <span className={styles.pending}>Debe cambiar la contraseña</span> : null}
              </td>
              <td className={styles.actions}>
                <ActionMenu
                  label={`Acciones de ${user.fullName}`}
                  items={[
                    { label: 'Editar', icon: Pencil, onSelect: () => onEdit(user) },
                    { label: 'Restablecer contraseña', icon: KeyRound, onSelect: () => onResetPassword(user) },
                    user.isActive
                      ? { label: 'Desactivar', icon: UserX, danger: true, onSelect: () => onToggleActive(user) }
                      : { label: 'Activar', icon: UserCheck, onSelect: () => onToggleActive(user) },
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
