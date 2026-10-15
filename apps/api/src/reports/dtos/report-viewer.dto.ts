import type { Role, UserArea } from '@sryg/types'

/** The user asking for a report: the role and area decide which reports they reach (D10, D24). */
export interface ReportViewer {
  id: string
  role: Role
  area: UserArea
}
