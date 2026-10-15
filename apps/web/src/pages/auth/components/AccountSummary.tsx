import type { AuthUser } from '@sryg/types'
import { Label } from '../../../common/components'
import { AREA_LABEL, ROLE_LABEL } from '../../../common/utils/role-labels'
import styles from './AccountSummary.module.css'

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.item}>
      <Label>{label}</Label>
      <span className={styles.value}>{value}</span>
    </div>
  )
}

/** Read-only account data: only an Admin changes name, role or area (/usuarios). */
export function AccountSummary({ user }: { user: AuthUser }) {
  return (
    <div className={styles.grid}>
      <Item label="Nombre" value={user.fullName} />
      <Item label="Correo" value={user.email} />
      <Item label="Rol" value={ROLE_LABEL[user.role]} />
      <Item label="Área" value={AREA_LABEL[user.area]} />
    </div>
  )
}
