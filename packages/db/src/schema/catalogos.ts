import { sql } from 'drizzle-orm'
import { boolean, check, integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { rav60Category, rav67Class } from './enums'
import { timestamps } from './timestamps'

// Catalogs maintained by the Admin (D19). Items in use are deactivated, never deleted (RESTRICT FKs).
// `name_en` feeds the bilingual credential and is null when the item has no English text.
const catalogColumns = () => ({
  id: uuid('id').primaryKey().defaultRandom(),
  nameEs: text('name_es').notNull(),
  nameEn: text('name_en'),
  active: boolean('active').notNull().default(true),
  ...timestamps,
})

export const catalogLicenseType = pgTable(
  'catalog_license_type',
  {
    ...catalogColumns(),
    rav60Category: rav60Category('rav60_category').notNull(),
    // D13: the RAV 67 class needed to issue or renew; null = none.
    requiredMedicalClass: rav67Class('required_medical_class'),
    // D20: false = licenses of this type do not expire.
    appliesExpiry: boolean('applies_expiry').notNull().default(true),
    validityMonths: integer('validity_months'),
    // D3: true until the Admin saves a real value.
    validityIsPlaceholder: boolean('validity_is_placeholder').notNull().default(true),
  },
  (t) => [
    uniqueIndex('catalog_license_type_name_es_lower_key').on(sql`lower(${t.nameEs})`),
    check('catalog_license_type_validity_positive', sql`${t.validityMonths} is null or ${t.validityMonths} > 0`),
  ],
)

/** Aircraft model of a type rating (e.g. B737). */
export const catalogTypeRating = pgTable('catalog_type_rating', catalogColumns(), (t) => [
  uniqueIndex('catalog_type_rating_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])

export const catalogClassRating = pgTable('catalog_class_rating', catalogColumns(), (t) => [
  uniqueIndex('catalog_class_rating_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])

export const catalogAircraft = pgTable('catalog_aircraft', catalogColumns(), (t) => [
  uniqueIndex('catalog_aircraft_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])

/** Function on a type rating (Capitán/PIC, Copiloto/SIC, No aplica). */
export const catalogFunction = pgTable('catalog_function', catalogColumns(), (t) => [
  uniqueIndex('catalog_function_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])

export const catalogLicenseObservation = pgTable('catalog_license_observation', catalogColumns(), (t) => [
  uniqueIndex('catalog_license_observation_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])

/** Operational restrictions/observations only, never diagnoses (BR-05, D8). */
export const catalogMedicalObservation = pgTable('catalog_medical_observation', catalogColumns(), (t) => [
  uniqueIndex('catalog_medical_observation_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])

export const catalogDocumentType = pgTable('catalog_document_type', catalogColumns(), (t) => [
  uniqueIndex('catalog_document_type_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])

export const catalogAttachmentType = pgTable('catalog_attachment_type', catalogColumns(), (t) => [
  uniqueIndex('catalog_attachment_type_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])

export const catalogNationality = pgTable('catalog_nationality', catalogColumns(), (t) => [
  uniqueIndex('catalog_nationality_name_es_lower_key').on(sql`lower(${t.nameEs})`),
])
