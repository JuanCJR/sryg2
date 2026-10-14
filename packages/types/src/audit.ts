import { z } from 'zod'
import { AUDIT_ACTIONS } from './enums'

// Contracts of the audit viewer (W1-7, REP-04/REP-05).
export const auditActionSchema = z.enum(AUDIT_ACTIONS)

/** A text filter: trimmed, and dropped when blank. */
const textFilter = z
  .string()
  .trim()
  .max(200)
  .transform((value) => value || undefined)
  .optional()

const auditFilterShape = {
  /** Matches the actor's full name or email (case-insensitive, substring). */
  actor: textFilter,
  action: auditActionSchema.optional(),
  /** Entity name as written by the trail (the table name, e.g. `personal_aeronautico`). */
  entity: textFilter,
  entityId: z.uuid().optional(),
  /**
   * The person's whole trail: their record plus the entities that hang from it (attachments,
   * licenses and their ratings, medical certificates, blocks and alerts).
   */
  personId: z.uuid().optional(),
  /** Inclusive range of calendar days, in UTC. */
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}

const validRange = (query: { from?: string; to?: string }) => !query.from || !query.to || query.from <= query.to
const RANGE_ERROR = { message: '`from` must not be after `to`', path: ['from'] }

/** GET /api/audit — filters plus pagination, newest first. */
export const auditListQuerySchema = z
  .object({
    ...auditFilterShape,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine(validRange, RANGE_ERROR)
  .transform(dropUndefined)
export type AuditListQuery = z.infer<typeof auditListQuerySchema>

/** GET /api/audit/export.csv — the same filters, every matching entry. */
export const auditExportQuerySchema = z
  .object(auditFilterShape)
  .refine(validRange, RANGE_ERROR)
  .transform(dropUndefined)
export type AuditExportQuery = z.infer<typeof auditExportQuerySchema>
export type AuditFilter = AuditExportQuery

export const auditActorSchema = z.object({ id: z.uuid(), fullName: z.string(), email: z.string() })
export type AuditActor = z.infer<typeof auditActorSchema>

export const auditEntrySchema = z.object({
  id: z.number().int(),
  occurredAt: z.iso.datetime(),
  /** Null = anonymous or system event (e.g. a failed login). */
  actor: auditActorSchema.nullable(),
  action: auditActionSchema,
  entity: z.string(),
  entityId: z.uuid().nullable(),
  changes: z.object({ before: z.unknown().optional(), after: z.unknown().optional() }).nullable(),
})
export type AuditEntryDto = z.infer<typeof auditEntrySchema>

function dropUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}
