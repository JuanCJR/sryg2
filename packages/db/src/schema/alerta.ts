import { sql } from 'drizzle-orm'
import { check, date, index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { alertKind, credentialKind } from './enums'
import { personalAeronautico } from './personal'
import { usuario } from './usuario'

/**
 * Expiry alerts (D6, BR-12), recalculated idempotently from the credentials. `credential_id` points
 * to the table named by `credential_kind`, so it has no foreign key.
 */
export const alerta = pgTable(
  'alerta',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalId: uuid('personal_id')
      .notNull()
      .references(() => personalAeronautico.id, { onDelete: 'cascade' }),
    credentialKind: credentialKind('credential_kind').notNull(),
    credentialId: uuid('credential_id').notNull(),
    kind: alertKind('kind').notNull(),
    dueDate: date('due_date').notNull(),
    acknowledgedBy: uuid('acknowledged_by').references(() => usuario.id, { onDelete: 'restrict' }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('alerta_credential_kind_key').on(t.credentialId, t.kind),
    check('alerta_acknowledgement', sql`(${t.acknowledgedBy} is null) = (${t.acknowledgedAt} is null)`),
    index('alerta_personal_id_idx').on(t.personalId),
    index('alerta_due_date_idx').on(t.dueDate),
  ],
)
