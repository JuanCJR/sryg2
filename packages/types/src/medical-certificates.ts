import { z } from 'zod'
import { catalogOptionSchema } from './catalogs'
import { AUDIT_ACTIONS, DERIVED_CREDENTIAL_STATUSES, RAV67_CLASSES } from './enums'
import { isoDateSchema } from './personnel'

// Contracts of the medical-certificates module (W1-6). No clinical data (BR-05, D8): every input
// is a strict object, so a field outside the administrative data is rejected, never stored.
export const rav67ClassSchema = z.enum(RAV67_CLASSES)

const numberSchema = z.string().trim().min(1).max(50)
const observationIdsSchema = z
  .array(z.uuid())
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length, 'Repeated observation')
/** General operational restrictions in free text; blank means none. */
const restrictionsSchema = z
  .string()
  .trim()
  .max(500)
  .nullish()
  .transform((value) => value || null)

/** Register a certificate. The number defaults to the holder's document (D22); expiry is derived (D3). */
export const registerMedicalCertificateSchema = z.strictObject({
  rav67Class: rav67ClassSchema,
  number: numberSchema.optional(),
  issueDate: isoDateSchema,
  observationIds: observationIdsSchema.default([]),
  restrictions: restrictionsSchema,
})
export type RegisterMedicalCertificateInput = z.infer<typeof registerMedicalCertificateSchema>

/** Renew a certificate of the same class. Omitted fields keep their current value. */
export const renewMedicalCertificateSchema = z.strictObject({
  number: numberSchema.optional(),
  issueDate: isoDateSchema,
  observationIds: observationIdsSchema.optional(),
  restrictions: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null)),
})
export type RenewMedicalCertificateInput = z.infer<typeof renewMedicalCertificateSchema>

export const medicalCertificateSchema = z.object({
  id: z.uuid(),
  personalId: z.uuid(),
  rav67Class: rav67ClassSchema,
  number: z.string(),
  issueDate: isoDateSchema,
  expiryDate: isoDateSchema,
  restrictions: z.string().nullable(),
  observations: catalogOptionSchema.array(),
  /** Derived on every read (D17, BR-12): never the stored column. */
  status: z.enum(DERIVED_CREDENTIAL_STATUSES),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type MedicalCertificateDto = z.infer<typeof medicalCertificateSchema>

const parameterSchema = <T extends z.ZodType>(value: T) => z.object({ value, isPlaceholder: z.boolean() })

/** Certificates of one person, newest issue first, plus what the forms and tabs need around them. */
export const personMedicalCertificatesSchema = z.object({
  personalId: z.uuid(),
  /** BR-07: while true, registering or renewing answers 409. */
  hasActiveBlock: z.boolean(),
  /** The near-expiry threshold the statuses were derived with (D3). */
  alertThresholdDays: parameterSchema(z.number().int()),
  items: medicalCertificateSchema.array(),
})
export type PersonMedicalCertificatesDto = z.infer<typeof personMedicalCertificatesSchema>

/** Validity in months of each RAV 67 class (D3), with its `PENDIENTE INAC` flag. */
export const medicalValiditySchema = z.object({
  clase_1: parameterSchema(z.number().int()),
  clase_2: parameterSchema(z.number().int()),
  clase_3: parameterSchema(z.number().int()),
})
export type MedicalValidityDto = z.infer<typeof medicalValiditySchema>

/** One audit row of a certificate (MED-07). */
export const medicalCertificateHistoryEntrySchema = z.object({
  id: z.number().int(),
  action: z.enum(AUDIT_ACTIONS),
  occurredAt: z.iso.datetime(),
  actor: z.object({ id: z.uuid(), fullName: z.string() }).nullable(),
  changes: z.object({ before: z.unknown().optional(), after: z.unknown().optional() }).nullable(),
})
export type MedicalCertificateHistoryEntryDto = z.infer<typeof medicalCertificateHistoryEntrySchema>

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Expiry of a certificate issued on `issueDate` with the class validity (D3): the same day
 * `months` later, or the last day of that month when it is shorter.
 */
export function medicalExpiryDate(issueDate: string, months: number): string {
  if (!Number.isInteger(months) || months <= 0) throw new RangeError(`Invalid validity: ${months}`)
  const match = ISO_DATE.exec(issueDate)
  if (!match) throw new RangeError(`Invalid date: ${issueDate}`)
  const [, y, m, d] = match
  const monthIndex = Number(m) - 1 + months
  const year = Number(y) + Math.floor(monthIndex / 12)
  const month = monthIndex % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(Number(d), lastDay)
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
