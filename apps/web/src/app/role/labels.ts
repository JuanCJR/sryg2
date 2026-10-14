import type { Role, UserArea } from '@sryg/types'

export const ROLE_LABEL: Record<Role, string> = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  consulta: 'Consulta',
}

export const AREA_LABEL: Record<UserArea, string> = {
  licencias: 'Licencias',
  medicina: 'Medicina',
  ambas: 'Licencias y Medicina',
}
