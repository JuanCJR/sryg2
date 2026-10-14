import { DEMO_PERSON_ID } from '../demo/roster'

/**
 * The single path registry. `App.tsx`, the nav, the templates, and every
 * feature take their paths from here, so a route change (or the Q5 home-route
 * decision) is a one-file change. Imports only from `src/demo/`, never from
 * `src/features/**`, to avoid an import cycle with features that link here.
 */
export const PATHS = {
  login: '/ingreso',
  panel: '/panel',
  personnel: '/personal',
  personnelNew: '/personal/nuevo',
  blocks: '/bloqueos',
  reports: '/reportes',
  audit: '/auditoria',
  users: '/usuarios',
  settings: '/parametros',
  backups: '/respaldos',
  profile: '/perfil',
} as const

export const personnelDetail = (id: string) => `/personal/${id}`
export const personnelEdit = (id: string) => `/personal/${id}/editar`
export const licenseForm = (id: string) => `/personal/${id}/licencia`
export const medicalForm = (id: string) => `/personal/${id}/certificado-medico`

/** Q5: flip to `{ path: PATHS.panel, label: 'Volver al panel' }` once the user resolves it. */
export const HOME = { path: personnelDetail(DEMO_PERSON_ID), label: 'Volver al expediente de demostración' } as const
