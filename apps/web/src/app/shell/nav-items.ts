import {
  Bell,
  DatabaseBackup,
  FileText,
  ScrollText,
  SlidersHorizontal,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Permission } from '../role/permissions'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  /** When set, the item (and its route) require this permission; unset means every role can see it. */
  permission?: Permission
  /** Groups the item under the "ADMINISTRACIÓN" nav-rail heading. */
  adminGroup?: boolean
  /** Short label shown under the icon on the tablet rail. */
  shortLabel: string
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/panel', label: 'Panel', shortLabel: 'Panel', icon: Bell },
  { path: '/personal', label: 'Personal', shortLabel: 'Personal', icon: Users },
  { path: '/reportes', label: 'Reportes', shortLabel: 'Reportes', icon: FileText },
  {
    path: '/auditoria',
    label: 'Auditoría',
    shortLabel: 'Auditoría',
    icon: ScrollText,
    permission: 'audit:view',
  },
  {
    path: '/usuarios',
    label: 'Usuarios',
    shortLabel: 'Usuarios',
    icon: UserCog,
    permission: 'users:admin',
    adminGroup: true,
  },
  {
    path: '/parametros',
    label: 'Parámetros',
    shortLabel: 'Parám.',
    icon: SlidersHorizontal,
    permission: 'settings:admin',
    adminGroup: true,
  },
  {
    path: '/respaldos',
    label: 'Respaldos',
    shortLabel: 'Respaldos',
    icon: DatabaseBackup,
    permission: 'backups:view',
    adminGroup: true,
  },
]
