import { z } from 'zod'
import {
  BLOCK_TYPES,
  CREDENTIAL_KINDS,
  DERIVED_CREDENTIAL_STATUSES,
  type DerivedCredentialStatus,
  RAV60_CATEGORIES,
  RAV67_CLASSES,
  type Role,
  type UserArea,
} from './enums'
import { can } from './permissions'

// Contracts of the reports module (W1-8). The three v1 reports of D10.
export const REPORTS = ['vencimientos', 'estado_consolidado', 'bloqueos_activos'] as const
export type ReportId = (typeof REPORTS)[number]
export const REPORT_EXPORT_FORMATS = ['csv', 'pdf'] as const
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number]

export const reportIdSchema = z.enum(REPORTS)

/** Reports the Consulta role may read (D10: only report 1); it exports none (§4 matrix). */
const CONSULTA_REPORTS: readonly ReportId[] = ['vencimientos']

/** `can()` for the reports module plus the per-report limit of D10. */
export function canAccessReport(role: Role, area: UserArea, report: ReportId, action: 'read' | 'export'): boolean {
  if (!can(role, area, 'reports', action)) return false
  return role !== 'consulta' || CONSULTA_REPORTS.includes(report)
}

/** Consolidated status of a person with no current credential (report 2). */
export const NO_CREDENTIALS_STATUS = 'sin_credenciales'
export const REPORT_STATUSES = [...DERIVED_CREDENTIAL_STATUSES, NO_CREDENTIALS_STATUS] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

// Same order as the design system's worstStatus: bloqueada, vencida, próxima, vigente.
const STATUS_SEVERITY: Record<DerivedCredentialStatus, number> = {
  bloqueada: 0,
  vencida: 1,
  proxima_a_vencer: 2,
  vigente: 3,
}

/** The worst of a set of credential statuses; null for an empty set. */
export function worstCredentialStatus(statuses: readonly DerivedCredentialStatus[]): DerivedCredentialStatus | null {
  return statuses.reduce<DerivedCredentialStatus | null>(
    (worst, s) => (worst === null || STATUS_SEVERITY[s] < STATUS_SEVERITY[worst] ? s : worst),
    null,
  )
}

/** Empty query-string values (`?status=`) mean "no filter". */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema.optional())

const reportFiltersShape = {
  /** Name or document number of the holder. */
  q: optional(z.string().trim().max(100)),
  licenseTypeId: optional(z.uuid()),
  rav60Category: optional(z.enum(RAV60_CATEGORIES)),
  /** Report 1: the credential status; report 2: the consolidated status. Report 3 has no status. */
  status: optional(z.enum(REPORT_STATUSES)),
  /** Inclusive date range: expiry (reports 1 and 2) or registration of the block (report 3). */
  from: optional(z.iso.date()),
  to: optional(z.iso.date()),
}

const validRange = (q: { from?: string; to?: string }) => !q.from || !q.to || q.from <= q.to
const rangeIssue = { message: '`from` must not be after `to`', path: ['to'] }

export const reportFiltersSchema = z.object(reportFiltersShape).refine(validRange, rangeIssue)
export type ReportFilters = z.infer<typeof reportFiltersSchema>

export const reportQuerySchema = z
  .object({
    ...reportFiltersShape,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine(validRange, rangeIssue)
export type ReportQuery = z.infer<typeof reportQuerySchema>

export const reportExportQuerySchema = z
  .object({ ...reportFiltersShape, format: z.enum(REPORT_EXPORT_FORMATS) })
  .refine(validRange, rangeIssue)
export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>

const derivedStatusSchema = z.enum(DERIVED_CREDENTIAL_STATUSES)

/** Report 1: one expired or near-expiry credential. */
export const expiryReportRowSchema = z.object({
  personalId: z.uuid(),
  cedula: z.string(),
  fullName: z.string(),
  credentialKind: z.enum(CREDENTIAL_KINDS),
  credentialId: z.uuid(),
  /** License type, aircraft model and function, class rating or RAV 67 class. */
  description: z.string(),
  licenseTypeName: z.string().nullable(),
  rav60Category: z.enum(RAV60_CATEGORIES).nullable(),
  number: z.string().nullable(),
  expiryDate: z.iso.date(),
  /** Negative once expired. */
  daysRemaining: z.number().int(),
  status: derivedStatusSchema,
})
export type ExpiryReportRow = z.infer<typeof expiryReportRowSchema>

/** Report 2: the current credentials of one person and their worst status. */
export const consolidatedReportRowSchema = z.object({
  personalId: z.uuid(),
  cedula: z.string(),
  fullName: z.string(),
  licenses: z.array(
    z.object({
      licenseTypeName: z.string(),
      rav60Category: z.enum(RAV60_CATEGORIES),
      number: z.string(),
      expiryDate: z.iso.date().nullable(),
      status: derivedStatusSchema,
    }),
  ),
  ratings: z.object({ total: z.number().int(), expired: z.number().int(), nearExpiry: z.number().int() }),
  medical: z
    .object({
      rav67Class: z.enum(RAV67_CLASSES),
      number: z.string(),
      expiryDate: z.iso.date(),
      status: derivedStatusSchema,
    })
    .nullable(),
  activeBlocks: z.number().int(),
  nextExpiryDate: z.iso.date().nullable(),
  status: z.enum(REPORT_STATUSES),
})
export type ConsolidatedReportRow = z.infer<typeof consolidatedReportRowSchema>

/** Report 3: one unresolved block. */
export const activeBlockReportRowSchema = z.object({
  blockId: z.uuid(),
  personalId: z.uuid(),
  cedula: z.string(),
  fullName: z.string(),
  type: z.enum(BLOCK_TYPES),
  reason: z.string(),
  createdAt: z.iso.datetime(),
  createdByName: z.string(),
})
export type ActiveBlockReportRow = z.infer<typeof activeBlockReportRowSchema>

export interface ReportRowById {
  vencimientos: ExpiryReportRow
  estado_consolidado: ConsolidatedReportRow
  bloqueos_activos: ActiveBlockReportRow
}

/** A page of a report. The threshold is the one used to derive `proxima_a_vencer` (D3). */
export interface ReportPage<R extends ReportId = ReportId> {
  report: R
  generatedAt: string
  today: string
  thresholdDays: number
  thresholdIsPlaceholder: boolean
  items: ReportRowById[R][]
  page: number
  pageSize: number
  total: number
}

export const REPORT_ROW_SCHEMAS = {
  vencimientos: expiryReportRowSchema,
  estado_consolidado: consolidatedReportRowSchema,
  bloqueos_activos: activeBlockReportRowSchema,
} as const satisfies { [R in ReportId]: z.ZodType<ReportRowById[R]> }
