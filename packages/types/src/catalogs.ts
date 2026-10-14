import { z } from 'zod'
import { RAV60_CATEGORIES, RAV67_CLASSES } from './enums'

/** URL slugs of the D19 catalogs, as used by `/api/catalogs/:catalog/...`. */
export const CATALOGS = [
  'license-types',
  'type-ratings',
  'class-ratings',
  'aircraft',
  'functions',
  'license-observations',
  'medical-observations',
  'document-types',
  'attachment-types',
  'nationalities',
] as const
export type CatalogSlug = (typeof CATALOGS)[number]

export const catalogParamSchema = z.enum(CATALOGS)

export const catalogOptionsQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((q) => q || undefined),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export type CatalogOptionsQuery = z.infer<typeof catalogOptionsQuerySchema>

/** One active item, for selectors. `nameEn` is null when the item has no English text. */
export const catalogOptionSchema = z.object({ id: z.uuid(), nameEs: z.string(), nameEn: z.string().nullable() })
export type CatalogOption = z.infer<typeof catalogOptionSchema>

// --- Maintenance (W1-11): Admin CRUD over every D19 catalog ---------------------------------

const booleanParam = z.enum(['true', 'false']).transform((value) => value === 'true')

/** `GET /api/catalogs/:catalog`: every item (active or not) for the maintenance pages. */
export const catalogListQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((q) => q || undefined),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  active: booleanParam.optional(),
})
export type CatalogListQuery = z.infer<typeof catalogListQuerySchema>

const nameEs = z.string().trim().min(1).max(200)
/** Blank English text means "no translation" and is stored as null. */
const nameEn = z
  .string()
  .trim()
  .max(200)
  .transform((value) => value || null)
  .nullish()

const baseCreateSchema = z.object({ nameEs, nameEn })

// D13 (required medical class), D20 (applies expiry) and D3 (validity in months, a parameter).
const licenseTypeFields = {
  rav60Category: z.enum(RAV60_CATEGORIES),
  requiredMedicalClass: z.enum(RAV67_CLASSES).nullish(),
  appliesExpiry: z.boolean().optional(),
  validityMonths: z.number().int().min(1).max(600).nullish(),
}
const licenseTypeCreateSchema = baseCreateSchema.extend(licenseTypeFields)

const nonEmpty = (body: object) => Object.keys(body).length > 0
const NON_EMPTY = 'At least one field is required'

const baseUpdateSchema = baseCreateSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine(nonEmpty, NON_EMPTY)
const licenseTypeUpdateSchema = licenseTypeCreateSchema
  .partial()
  .extend({ active: z.boolean().optional() })
  .refine(nonEmpty, NON_EMPTY)

export type CatalogItemCreateInput = z.infer<typeof baseCreateSchema>
export type LicenseTypeCreateInput = z.infer<typeof licenseTypeCreateSchema>
export type CatalogItemUpdateInput = z.infer<typeof baseUpdateSchema>
export type LicenseTypeUpdateInput = z.infer<typeof licenseTypeUpdateSchema>
/** Any catalog's create body; the license-type fields only reach license types. */
export type AnyCatalogItemCreateInput = CatalogItemCreateInput & Partial<LicenseTypeCreateInput>
export type AnyCatalogItemUpdateInput = CatalogItemUpdateInput & Partial<LicenseTypeUpdateInput>

/** Body of `POST /api/catalogs/:catalog`. Fields of other catalogs are dropped. */
export function catalogItemCreateSchemaFor(catalog: CatalogSlug): z.ZodType<AnyCatalogItemCreateInput> {
  return catalog === 'license-types' ? licenseTypeCreateSchema : baseCreateSchema
}

/** Body of `PATCH /api/catalogs/:catalog/:id`; `active` activates or deactivates the item. */
export function catalogItemUpdateSchemaFor(catalog: CatalogSlug): z.ZodType<AnyCatalogItemUpdateInput> {
  return catalog === 'license-types' ? licenseTypeUpdateSchema : baseUpdateSchema
}

export const catalogItemSchema = z.object({
  id: z.uuid(),
  nameEs: z.string(),
  nameEn: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type CatalogItemDto = z.infer<typeof catalogItemSchema>

export const licenseTypeItemSchema = catalogItemSchema.extend({
  rav60Category: z.enum(RAV60_CATEGORIES),
  requiredMedicalClass: z.enum(RAV67_CLASSES).nullable(),
  appliesExpiry: z.boolean(),
  validityMonths: z.number().int().nullable(),
  /** D3: true until the Admin saves a validity; the UI marks it "PENDIENTE INAC". */
  validityIsPlaceholder: z.boolean(),
})
export type LicenseTypeItemDto = z.infer<typeof licenseTypeItemSchema>
export type AnyCatalogItemDto = CatalogItemDto & Partial<Omit<LicenseTypeItemDto, keyof CatalogItemDto>>

/** One item as the maintenance endpoints return it. */
export function catalogItemSchemaFor(catalog: CatalogSlug): z.ZodType<AnyCatalogItemDto> {
  return catalog === 'license-types' ? licenseTypeItemSchema : catalogItemSchema
}
