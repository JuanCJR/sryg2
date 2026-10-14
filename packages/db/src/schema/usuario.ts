import { boolean, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { userArea, userRole } from './enums'
import { timestamps } from './timestamps'

export const usuario = pgTable(
  'usuario',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    role: userRole('role').notNull(),
    // D24: a Supervisor writes only in their area; ignored for the Admin.
    area: userArea('area').notNull(),
    passwordHash: text('password_hash').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    // D4: set by an Admin reset; the next login must change the password.
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('usuario_email_lower_key').on(sql`lower(${t.email})`)],
)
