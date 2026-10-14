import type { ManagedUser } from '@sryg/types'
import { Button, Lamp } from '../../../design-system'
import { AREA_LABEL, ROLE_LABEL } from '../../../app/role/labels'
import styles from './UsersTable.module.css'

export interface UsersTableProps {
  users: ManagedUser[]
  onEdit: (user: ManagedUser) => void
  onResetPassword: (user: ManagedUser) => void
  onToggleActive: (user: ManagedUser) => void
}

/** Users with their role, area and state, and the Admin's actions on each row (AUTH-06). */
export function UsersTable({ users, onEdit, onResetPassword, onToggleActive }: UsersTableProps) {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Nombre</th>
          <th scope="col">Correo</th>
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
            <td className={styles.name}>{user.fullName}</td>
            <td className={styles.email}>{user.email}</td>
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
              <Button variant="ghost" size="sm" onClick={() => onEdit(user)}>
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onResetPassword(user)}>
                Restablecer contraseña
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onToggleActive(user)}>
                {user.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
