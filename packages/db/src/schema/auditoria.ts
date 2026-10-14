import { sql } from 'drizzle-orm'
import { bigint, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { auditAction } from './enums'
import { usuario } from './usuario'

// Append-only: a trigger (migration 0001) rejects UPDATE and DELETE.
export const auditoria = pgTable(
  'auditoria',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    // Null actor = anonymous/system event (e.g. failed login).
    actorId: uuid('actor_id').references(() => usuario.id, { onDelete: 'restrict' }),
    action: auditAction('action').notNull(),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id'),
    changes: jsonb('changes').$type<{ before?: unknown; after?: unknown }>(),
    requestId: text('request_id'),
  },
  (t) => [
    index('auditoria_entity_idx').on(t.entity, t.entityId),
    index('auditoria_actor_occurred_idx').on(t.actorId, sql`${t.occurredAt} desc`),
    index('auditoria_occurred_idx').on(sql`${t.occurredAt} desc`),
  ],
)
