import type { Role, UserArea } from './enums'

/**
 * Permission matrix of `docs/sryg-definitions-and-tasks.md` §4 (D1), extended with the user area
 * (D24). Pure data: the API guard and the web navigation both read it through `can`.
 */
export const PERMISSION_MODULES = [
  'personnel',
  'licenses',
  'medical_certificates',
  'blocking',
  'alerts',
  'reports',
  'audit',
  'users',
  'settings',
  'catalogs',
  'credentials',
  'backups',
] as const
export const PERMISSION_ACTIONS = ['read', 'write', 'export'] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

/** Area whose Supervisors may write the module; `null` = any area. Only read is open to the other area. */
type ModuleArea = Exclude<UserArea, 'ambas'> | null

interface ModulePermissions {
  area: ModuleArea
  grants: Record<Role, readonly PermissionAction[]>
}

const NONE: readonly PermissionAction[] = []
const READ: readonly PermissionAction[] = ['read']
const READ_WRITE: readonly PermissionAction[] = ['read', 'write']
const READ_EXPORT: readonly PermissionAction[] = ['read', 'export']

export const PERMISSION_MATRIX: Record<PermissionModule, ModulePermissions> = {
  personnel: { area: null, grants: { administrador: READ_WRITE, supervisor: READ_WRITE, consulta: READ } },
  licenses: { area: 'licencias', grants: { administrador: READ_WRITE, supervisor: READ_WRITE, consulta: READ } },
  // D24: "Admin o Supervisor de Medicina" (was Admin only in D1).
  medical_certificates: {
    area: 'medicina',
    grants: { administrador: READ_WRITE, supervisor: READ_WRITE, consulta: READ },
  },
  // D2: Admin and Supervisor register and resolve blocks.
  blocking: { area: null, grants: { administrador: READ_WRITE, supervisor: READ_WRITE, consulta: READ } },
  alerts: { area: null, grants: { administrador: READ, supervisor: READ, consulta: READ } },
  // Consulta sees only report 1 (D10); that per-report limit is applied by the reports module.
  reports: { area: null, grants: { administrador: READ_EXPORT, supervisor: READ_EXPORT, consulta: READ } },
  audit: { area: null, grants: { administrador: READ, supervisor: READ, consulta: NONE } },
  users: { area: null, grants: { administrador: READ_WRITE, supervisor: NONE, consulta: NONE } },
  settings: { area: null, grants: { administrador: READ_WRITE, supervisor: NONE, consulta: NONE } },
  // D19 / W1-11: only the Admin maintains catalogs; everybody reads them.
  catalogs: { area: null, grants: { administrador: READ_WRITE, supervisor: READ, consulta: READ } },
  credentials: { area: null, grants: { administrador: ['export'], supervisor: ['export'], consulta: NONE } },
  backups: { area: null, grants: { administrador: READ, supervisor: NONE, consulta: NONE } },
}

/** Roles whose writes are limited to their own area (D24). */
const AREA_SCOPED_ROLES: readonly Role[] = ['supervisor']

export function can(role: Role, area: UserArea, module: PermissionModule, action: PermissionAction): boolean {
  const entry = PERMISSION_MATRIX[module]
  if (!entry.grants[role].includes(action)) return false
  if (action === 'read' || entry.area === null || !AREA_SCOPED_ROLES.includes(role)) return true
  return area === 'ambas' || area === entry.area
}
