import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { blockStatus, blockType } from './enums'
import { personalAeronautico } from './personal'
import { timestamps } from './timestamps'
import { usuario } from './usuario'

export const bloqueo = pgTable(
  'bloqueo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalId: uuid('personal_id')
      .notNull()
      .references(() => personalAeronautico.id, { onDelete: 'restrict' }),
    type: blockType('type').notNull(),
    reason: text('reason').notNull(),
    status: blockStatus('status').notNull().default('activo'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    resolvedBy: uuid('resolved_by').references(() => usuario.id, { onDelete: 'restrict' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionNote: text('resolution_note'),
    ...timestamps,
  },
  (t) => [
    check(
      'bloqueo_resolution_consistency',
      sql`(${t.status} = 'resuelto') = (${t.resolvedBy} is not null and ${t.resolvedAt} is not null)
        and (${t.resolvedBy} is null) = (${t.resolvedAt} is null)`,
    ),
    index('bloqueo_personal_activo_idx')
      .on(t.personalId)
      .where(sql`${t.status} = 'activo'`),
  ],
)
