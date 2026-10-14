import { sql } from 'drizzle-orm'
import { check, date, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { credentialStatus, rav60Category, rav67Class } from './enums'
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
    rav60Category: rav60Category('rav60_category').notNull(),
    issueDate: date('issue_date').notNull(),
    expiryDate: date('expiry_date').notNull(),
    status: credentialStatus('status').notNull().default('activa'),
    ...timestamps,
  },
  (t) => [
    check('licencia_dates_order', sql`${t.expiryDate} > ${t.issueDate}`),
    index('licencia_personal_id_idx').on(t.personalId),
    index('licencia_expiry_date_idx').on(t.expiryDate),
  ],
)

export const habilitacion = pgTable(
  'habilitacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenciaId: uuid('licencia_id')
      .notNull()
      .references(() => licencia.id, { onDelete: 'restrict' }),
    type: text('type').notNull(),
    issueDate: date('issue_date').notNull(),
    expiryDate: date('expiry_date').notNull(),
    ...timestamps,
  },
  (t) => [
    check('habilitacion_dates_order', sql`${t.expiryDate} > ${t.issueDate}`),
    index('habilitacion_licencia_id_idx').on(t.licenciaId),
    index('habilitacion_expiry_date_idx').on(t.expiryDate),
  ],
)

// Only the class, dates and restrictions: no diagnosis or clinical history (BR-05).
export const certificadoMedico = pgTable(
  'certificado_medico',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalId: uuid('personal_id')
      .notNull()
      .references(() => personalAeronautico.id, { onDelete: 'restrict' }),
    rav67Class: rav67Class('rav67_class').notNull(),
    issueDate: date('issue_date').notNull(),
    expiryDate: date('expiry_date').notNull(),
    restrictions: text('restrictions'),
    status: credentialStatus('status').notNull().default('activa'),
    ...timestamps,
  },
  (t) => [
    check('certificado_medico_dates_order', sql`${t.expiryDate} > ${t.issueDate}`),
    index('certificado_medico_personal_id_idx').on(t.personalId),
    index('certificado_medico_expiry_date_idx').on(t.expiryDate),
  ],
)
