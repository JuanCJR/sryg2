import { sql } from 'drizzle-orm'
import { check, date, index, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import {
  catalogAircraft,
  catalogClassRating,
  catalogFunction,
  catalogLicenseObservation,
  catalogLicenseType,
  catalogMedicalObservation,
  catalogTypeRating,
} from './catalogos'
import { credentialStatus, rav67Class } from './enums'
import { personalAeronautico } from './personal'
import { timestamps } from './timestamps'

// `proxima_a_vencer` is derived from expiry_date and a configurable threshold, never stored (BR-12).

export const licencia = pgTable(
  'licencia',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalId: uuid('personal_id')
      .notNull()
      .references(() => personalAeronautico.id, { onDelete: 'restrict' }),
    licenseTypeId: uuid('license_type_id')
      .notNull()
      .references(() => catalogLicenseType.id, { onDelete: 'restrict' }),
    // D22: defaults to the holder's document number.
    number: text('number').notNull(),
    issueDate: date('issue_date').notNull(),
    // D20: null when the license type does not apply expiry.
    expiryDate: date('expiry_date'),
    status: credentialStatus('status').notNull().default('activa'),
    // D9: opaque token behind the QR; the public check never exposes ids.
    verificationToken: uuid('verification_token').notNull().unique().defaultRandom(),
    ...timestamps,
  },
  (t) => [
    check('licencia_dates_order', sql`${t.expiryDate} is null or ${t.expiryDate} > ${t.issueDate}`),
    index('licencia_personal_id_idx').on(t.personalId),
    index('licencia_license_type_id_idx').on(t.licenseTypeId),
    index('licencia_number_idx').on(t.number),
    index('licencia_expiry_date_idx').on(t.expiryDate),
  ],
)

export const licenciaObservacion = pgTable(
  'licencia_observacion',
  {
    licenciaId: uuid('licencia_id')
      .notNull()
      .references(() => licencia.id, { onDelete: 'cascade' }),
    observationId: uuid('observation_id')
      .notNull()
      .references(() => catalogLicenseObservation.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.licenciaId, t.observationId] })],
)

/** Type rating (D20): aircraft model + function + expiry. */
export const habilitacionTipo = pgTable(
  'habilitacion_tipo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenciaId: uuid('licencia_id')
      .notNull()
      .references(() => licencia.id, { onDelete: 'restrict' }),
    typeRatingId: uuid('type_rating_id')
      .notNull()
      .references(() => catalogTypeRating.id, { onDelete: 'restrict' }),
    functionId: uuid('function_id')
      .notNull()
      .references(() => catalogFunction.id, { onDelete: 'restrict' }),
    expiryDate: date('expiry_date').notNull(),
    ...timestamps,
  },
  (t) => [
    index('habilitacion_tipo_licencia_id_idx').on(t.licenciaId),
    index('habilitacion_tipo_expiry_date_idx').on(t.expiryDate),
  ],
)

/** Class rating (D20): class + list of aircraft + expiry. */
export const habilitacionClase = pgTable(
  'habilitacion_clase',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenciaId: uuid('licencia_id')
      .notNull()
      .references(() => licencia.id, { onDelete: 'restrict' }),
    classRatingId: uuid('class_rating_id')
      .notNull()
      .references(() => catalogClassRating.id, { onDelete: 'restrict' }),
    expiryDate: date('expiry_date').notNull(),
    ...timestamps,
  },
  (t) => [
    index('habilitacion_clase_licencia_id_idx').on(t.licenciaId),
    index('habilitacion_clase_expiry_date_idx').on(t.expiryDate),
  ],
)

export const habilitacionClaseAeronave = pgTable(
  'habilitacion_clase_aeronave',
  {
    habilitacionClaseId: uuid('habilitacion_clase_id')
      .notNull()
      .references(() => habilitacionClase.id, { onDelete: 'cascade' }),
    aircraftId: uuid('aircraft_id')
      .notNull()
      .references(() => catalogAircraft.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.habilitacionClaseId, t.aircraftId] })],
)

// Only the class, number, dates and restrictions: no diagnosis or clinical history (BR-05).
export const certificadoMedico = pgTable(
  'certificado_medico',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalId: uuid('personal_id')
      .notNull()
      .references(() => personalAeronautico.id, { onDelete: 'restrict' }),
    rav67Class: rav67Class('rav67_class').notNull(),
    // D22: defaults to the holder's document number.
    number: text('number').notNull(),
    issueDate: date('issue_date').notNull(),
    expiryDate: date('expiry_date').notNull(),
    restrictions: text('restrictions'),
    status: credentialStatus('status').notNull().default('activa'),
    verificationToken: uuid('verification_token').notNull().unique().defaultRandom(),
    ...timestamps,
  },
  (t) => [
    check('certificado_medico_dates_order', sql`${t.expiryDate} > ${t.issueDate}`),
    index('certificado_medico_personal_id_idx').on(t.personalId),
    index('certificado_medico_expiry_date_idx').on(t.expiryDate),
  ],
)

export const certificadoObservacion = pgTable(
  'certificado_observacion',
  {
    certificadoMedicoId: uuid('certificado_medico_id')
      .notNull()
      .references(() => certificadoMedico.id, { onDelete: 'cascade' }),
    observationId: uuid('observation_id')
      .notNull()
      .references(() => catalogMedicalObservation.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.certificadoMedicoId, t.observationId] })],
)
