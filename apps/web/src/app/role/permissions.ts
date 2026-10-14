export type Role = 'administrador' | 'supervisor' | 'consulta'

export const ROLES: Role[] = ['administrador', 'supervisor', 'consulta']

export const ROLE_LABEL: Record<Role, string> = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  consulta: 'Consulta',
}

// Demo encoding of the §4 permission matrix, proposed and pending INAC validation (OD-14).
export type Permission =
  | 'personnel:write'
  | 'licenses:issueRenew'
  | 'blocking:register'
  | 'blocking:resolve'
  | 'medical:write'
  | 'audit:view'
  | 'users:admin'
  | 'settings:admin'
  | 'backups:view'
  | 'credentials:print'

const GRANTS: Record<Permission, Role[]> = {
  'personnel:write': ['administrador', 'supervisor'],
  'licenses:issueRenew': ['administrador', 'supervisor'],
  'blocking:register': ['administrador', 'supervisor'],
  'blocking:resolve': ['administrador', 'supervisor'],
  'medical:write': ['administrador'],
  'audit:view': ['administrador', 'supervisor'],
  'users:admin': ['administrador'],
  'settings:admin': ['administrador'],
  'backups:view': ['administrador'],
  'credentials:print': ['administrador', 'supervisor'],
}

export function roleCan(role: Role, permission: Permission): boolean {
  return GRANTS[permission].includes(role)
}
