import { z } from 'zod'

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
