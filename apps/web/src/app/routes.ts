import type { CatalogSlug } from '@sryg/types'

/**
 * The single path registry. `App.tsx`, the nav, the templates, and every feature take their
 * paths from here, so a route change is a one-file change. Never imports from
 * `src/features/**`, to avoid an import cycle with features that link here.
 */
export const PATHS = {
  login: '/ingreso',
  panel: '/panel',
  personnel: '/personal',
  personnelNew: '/personal/nuevo',
  licenses: '/licencias',
  blocks: '/bloqueos',
  reports: '/reportes',
  audit: '/auditoria',
  users: '/usuarios',
  settings: '/parametros',
  catalogs: '/catalogos',
  profile: '/perfil',
  forbidden: '/403',
} as const

export const personnelDetail = (id: string) => `/personal/${id}`
export const personnelEdit = (id: string) => `/personal/${id}/editar`
export const licenseForm = (id: string) => `/personal/${id}/licencia`
export const medicalForm = (id: string) => `/personal/${id}/certificado-medico`
export const catalogDetail = (catalog: CatalogSlug) => `/catalogos/${catalog}`
export const verifyCredential = (token: string) => `/verificar/${token}`

/** D16: `/` redirects to the panel, which is also where error pages send the user back. */
export const HOME = { path: PATHS.panel, label: 'Volver al panel' } as const
