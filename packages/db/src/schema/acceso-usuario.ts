import { sql } from 'drizzle-orm'
import { bigint, boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { usuario } from './usuario'

/**
 * Every login attempt (D23), for the last accesses and failed attempts on /panel. `usuario_id` is
 * set whenever the identifier matches a user, also on failures; null for unknown identifiers.
 */
export const accesoUsuario = pgTable(
  'acceso_usuario',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    usuarioId: uuid('usuario_id').references(() => usuario.id, { onDelete: 'set null' }),
    identifier: text('identifier').notNull(),
    ip: text('ip'),
    success: boolean('success').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('acceso_usuario_usuario_created_idx').on(t.usuarioId, sql`${t.createdAt} desc`)],
)
