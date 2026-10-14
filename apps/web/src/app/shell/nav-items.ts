import {
  Bell,
  BookOpen,
  FileText,
  IdCard,
  Lock,
  ScrollText,
  SlidersHorizontal,
  Stethoscope,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { can, type PermissionAction, type PermissionModule, type Role, type UserArea } from '@sryg/types'
import { PATHS, catalogDetail } from '../routes'

export type NavGroupId = 'general' | 'licencias' | 'medicina' | 'administracion'

export interface NavItem {
  path: string
  label: string
  /** Short label shown under the icon on the tablet rail. */
  shortLabel: string
  icon: LucideIcon
  /** The item shows only when `can(role, area, module, action)` allows it (D1, D24). */
  permission: { module: PermissionModule; action: PermissionAction }
}

export interface NavGroup {
  id: NavGroupId
  /** Heading shown above the group; the general group has none. */
  label?: string
  /** Area the group belongs to (as in SLYM): shown to users of that area, of both, or to the Admin. */
  area?: Exclude<UserArea, 'ambas'>
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'general',
    items: [
      {
        path: PATHS.panel,
        label: 'Panel',
        shortLabel: 'Panel',
        icon: Bell,
        permission: { module: 'alerts', action: 'read' },
      },
      {
        path: PATHS.personnel,
        label: 'Personal',
        shortLabel: 'Personal',
        icon: Users,
        permission: { module: 'personnel', action: 'read' },
      },
      {
        path: PATHS.blocks,
        label: 'Bloqueos',
        shortLabel: 'Bloqueos',
        icon: Lock,
        permission: { module: 'blocking', action: 'read' },
      },
      {
        path: PATHS.reports,
        label: 'Reportes',
        shortLabel: 'Reportes',
        icon: FileText,
        permission: { module: 'reports', action: 'read' },
      },
      {
        path: PATHS.audit,
        label: 'Auditoría',
        shortLabel: 'Auditoría',
        icon: ScrollText,
        permission: { module: 'audit', action: 'read' },
      },
    ],
  },
  {
    id: 'licencias',
    label: 'Licencias',
    area: 'licencias',
    items: [
      {
        path: PATHS.licenses,
        label: 'Consulta de licencias',
        shortLabel: 'Licencias',
        icon: IdCard,
        permission: { module: 'licenses', action: 'read' },
      },
    ],
  },
  {
    id: 'medicina',
    label: 'Medicina',
    area: 'medicina',
    items: [
      {
        path: catalogDetail('medical-observations'),
        label: 'Observaciones médicas',
        shortLabel: 'Obs. méd.',
        icon: Stethoscope,
        permission: { module: 'catalogs', action: 'read' },
      },
    ],
  },
  {
    id: 'administracion',
    label: 'Administración',
    items: [
      {
        path: PATHS.catalogs,
        label: 'Catálogos',
        shortLabel: 'Catálogos',
        icon: BookOpen,
        permission: { module: 'catalogs', action: 'write' },
      },
      {
        path: PATHS.users,
        label: 'Usuarios',
        shortLabel: 'Usuarios',
        icon: UserCog,
        permission: { module: 'users', action: 'write' },
      },
      {
        path: PATHS.settings,
        label: 'Parámetros',
        shortLabel: 'Parám.',
        icon: SlidersHorizontal,
        permission: { module: 'settings', action: 'write' },
      },
    ],
  },
]

/** The groups and items one user sees: permission per item, area per group; empty groups are dropped. */
export function visibleNavGroups(role: Role, area: UserArea): NavGroup[] {
  const inArea = (group: NavGroup) => !group.area || role === 'administrador' || area === 'ambas' || area === group.area
  return NAV_GROUPS.filter(inArea)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(role, area, item.permission.module, item.permission.action)),
    }))
    .filter((group) => group.items.length > 0)
}
