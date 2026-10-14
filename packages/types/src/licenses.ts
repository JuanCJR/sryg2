import { z } from 'zod'
import { listQuerySchema } from './common'
import { AUDIT_ACTIONS, DERIVED_CREDENTIAL_STATUSES, RAV60_CATEGORIES, RAV67_CLASSES } from './enums'

// Contracts of the licenses module (W1-5): licenses with their type and class ratings and observations (D20).
export const rav60CategorySchema = z.enum(RAV60_CATEGORIES)

const isoDate = z.iso.date()
const ids = (max: number) =>
  z
    .array(z.uuid())
    .max(max)
    .default([])
    .transform((list) => [...new Set(list)])

/** A catalog item as the license shows it: Spanish text plus the English one for the bilingual card (D19). */
export const catalogRefSchema = z.object({ id: z.uuid(), nameEs: z.string(), nameEn: z.string().nullable() })
export type CatalogRef = z.infer<typeof catalogRefSchema>

const derivedStatusSchema = z.enum(DERIVED_CREDENTIAL_STATUSES)

export const typeRatingSchema = z.object({
  id: z.uuid(),
  licenseId: z.uuid(),
  /** Aircraft model of the rating (catalog `type-ratings`). */
  typeRating: catalogRefSchema,
  function: catalogRefSchema,
  expiryDate: isoDate,
  status: derivedStatusSchema,
})
export type TypeRatingDto = z.infer<typeof typeRatingSchema>

export const classRatingSchema = z.object({
  id: z.uuid(),
  licenseId: z.uuid(),
  classRating: catalogRefSchema,
  aircraft: z.array(catalogRefSchema),
  expiryDate: isoDate,
  status: derivedStatusSchema,
})
export type ClassRatingDto = z.infer<typeof classRatingSchema>

export const licenseTypeRefSchema = catalogRefSchema.extend({
  rav60Category: rav60CategorySchema,
  /** D13: the RAV 67 class a valid medical certificate must have to issue or renew; null = none. */
  requiredMedicalClass: z.enum(RAV67_CLASSES).nullable(),
  /** D20: false = licenses of this type do not expire. */
  appliesExpiry: z.boolean(),
})
export type LicenseTypeRef = z.infer<typeof licenseTypeRefSchema>

export const licenseSchema = z.object({
  id: z.uuid(),
  personalId: z.uuid(),
  licenseType: licenseTypeRefSchema,
  number: z.string(),
  issueDate: isoDate,
  /** Null when the license type does not apply expiry (D20). */
  expiryDate: isoDate.nullable(),
  /** Derived (D17, BR-12): an active block wins over any date. */
  status: derivedStatusSchema,
  observations: z.array(catalogRefSchema),
  typeRatings: z.array(typeRatingSchema),
  classRatings: z.array(classRatingSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type LicenseDto = z.infer<typeof licenseSchema>

/** One row of the license query (`GET /api/licenses`), as in SLYM. */
export const licenseListItemSchema = z.object({
  id: z.uuid(),
  personalId: z.uuid(),
  person: z.object({ cedula: z.string(), firstNames: z.string(), lastNames: z.string() }),
  licenseType: catalogRefSchema.extend({ rav60Category: rav60CategorySchema }),
  number: z.string(),
  issueDate: isoDate,
  expiryDate: isoDate.nullable(),
  status: derivedStatusSchema,
})
export type LicenseListItemDto = z.infer<typeof licenseListItemSchema>

const optionalText = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined)

/**
 * Filters of the license query: `q` is the applicant (names or document number), `number` the
 * license number, `licenseTypeId` the catalog type and `expiryFrom`/`expiryTo` an inclusive expiry
 * range. Licenses without expiry never match an expiry range.
 */
export const licenseListQuerySchema = listQuerySchema
  .extend({
    q: optionalText,
    number: optionalText,
    personalId: z.uuid().optional(),
    licenseTypeId: z.uuid().optional(),
    expiryFrom: isoDate.optional(),
    expiryTo: isoDate.optional(),
  })
  .refine((q) => !q.expiryFrom || !q.expiryTo || q.expiryFrom <= q.expiryTo, {
    message: 'expiryFrom must not be after expiryTo',
    path: ['expiryTo'],
  })
export type LicenseListQuery = z.infer<typeof licenseListQuerySchema>

export const newTypeRatingSchema = z.object({ typeRatingId: z.uuid(), functionId: z.uuid(), expiryDate: isoDate })
export type NewTypeRatingInput = z.infer<typeof newTypeRatingSchema>

export const newClassRatingSchema = z.object({
  classRatingId: z.uuid(),
  aircraftIds: ids(100),
  expiryDate: isoDate,
})
export type NewClassRatingInput = z.infer<typeof newClassRatingSchema>

export const renewRatingSchema = z.object({ expiryDate: isoDate })
export type RenewRatingInput = z.infer<typeof renewRatingSchema>

const ratingRenewalSchema = z.object({ id: z.uuid(), expiryDate: isoDate })
const licenseNumber = z.string().trim().min(1).max(30)

/**
 * Issue a license (D20, D22): `number` defaults to the holder's document number. The expiry is
 * never sent: the API computes it from the type's validity. Ratings issued in the same trámite are
 * written in the same transaction.
 */
export const issueLicenseSchema = z.object({
  personalId: z.uuid(),
  licenseTypeId: z.uuid(),
  number: licenseNumber.optional(),
  issueDate: isoDate,
  observationIds: ids(50),
  addTypeRatings: z.array(newTypeRatingSchema).max(50).default([]),
  addClassRatings: z.array(newClassRatingSchema).max(50).default([]),
})
export type IssueLicenseInput = z.input<typeof issueLicenseSchema>

/**
 * Renew a license: new issue date (the expiry is recomputed), the full list of observations, and
 * the rating changes of the same trámite. `number` keeps the current one when omitted.
 */
export const renewLicenseSchema = z.object({
  number: licenseNumber.optional(),
  issueDate: isoDate,
  observationIds: ids(50),
  addTypeRatings: z.array(newTypeRatingSchema).max(50).default([]),
  renewTypeRatings: z.array(ratingRenewalSchema).max(50).default([]),
  removeTypeRatingIds: ids(50),
  addClassRatings: z.array(newClassRatingSchema).max(50).default([]),
  renewClassRatings: z.array(ratingRenewalSchema).max(50).default([]),
  removeClassRatingIds: ids(50),
})
export type RenewLicenseInput = z.input<typeof renewLicenseSchema>

/** Pre-check of a trámite (LIC-05): what would stop it and the expiry it would get. */
export const licenseCheckQuerySchema = z
  .object({
    personalId: z.uuid(),
    licenseTypeId: z.uuid().optional(),
    licenseId: z.uuid().optional(),
    issueDate: isoDate.optional(),
  })
  .refine((q) => !(q.licenseTypeId && q.licenseId), { message: 'Send licenseTypeId or licenseId, not both' })
export type LicenseCheckQuery = z.infer<typeof licenseCheckQuerySchema>

export const licenseCheckSchema = z.object({
  /** An active block (BR-07): the trámite cannot proceed at all. */
  blocked: z.boolean(),
  /** Readable reasons that would make the API answer 409 (block and D13 coherence). */
  problems: z.array(z.string()),
  /** Present when the type and the issue date are known. */
  projection: z
    .object({
      expiryDate: isoDate.nullable(),
      appliesExpiry: z.boolean(),
      /** D3: the validity is still the `PENDIENTE INAC` placeholder. */
      validityIsPlaceholder: z.boolean(),
    })
    .nullable(),
})
export type LicenseCheckDto = z.infer<typeof licenseCheckSchema>

/** One entry of a license's history (LIC-06), from the audit trail of the license and its ratings. */
export const licenseHistoryEntrySchema = z.object({
  id: z.number().int(),
  occurredAt: z.iso.datetime(),
  action: z.enum(AUDIT_ACTIONS),
  entity: z.enum(['licencia', 'habilitacion_tipo', 'habilitacion_clase']),
  entityId: z.uuid().nullable(),
  actorName: z.string().nullable(),
})
export type LicenseHistoryEntryDto = z.infer<typeof licenseHistoryEntrySchema>
