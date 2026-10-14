import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { bloodType, personnelStatus, rav60Category } from './enums'
import { timestamps } from './timestamps'
import { usuario } from './usuario'

export const personalAeronautico = pgTable(
  'personal_aeronautico',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Digits only, no nationality (user decision): 6 to 9 digits, unique.
    cedula: text('cedula').notNull().unique(),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    bloodType: bloodType('blood_type'),
    cargo: text('cargo'),
    dependencia: text('dependencia'),
    category: rav60Category('category'),
    status: personnelStatus('status').notNull().default('activo'),
    photoRef: text('photo_ref'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    updatedBy: uuid('updated_by')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    ...timestamps,
  },
  (t) => [
    check('personal_aeronautico_cedula_format', sql`${t.cedula} ~ '^[0-9]{6,9}$'`),
    index('personal_aeronautico_full_name_lower_idx').on(sql`lower(${t.fullName})`),
  ],
)
