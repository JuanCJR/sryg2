import { boolean, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { userRole } from './enums'
import { timestamps } from './timestamps'

export const usuario = pgTable(
  'usuario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    role: userRole('role').notNull(),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex('usuario_email_lower_key').on(sql`lower(${t.email})`)],
)
