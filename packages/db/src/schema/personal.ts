import { sql } from 'drizzle-orm'
import { check, date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { bytea } from './bytea'
import { catalogAttachmentType, catalogDocumentType, catalogNationality } from './catalogos'
import { bloodType, personnelStatus, rav60Category } from './enums'
import { timestamps } from './timestamps'
import { usuario } from './usuario'

export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024

export const personalAeronautico = pgTable(
  'personal_aeronautico',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Document number, digits only (user decision): 6 to 9 digits, unique.
    cedula: text('cedula').notNull().unique(),
    firstNames: text('first_names').notNull(),
    lastNames: text('last_names').notNull(),
    documentTypeId: uuid('document_type_id').references(() => catalogDocumentType.id, { onDelete: 'restrict' }),
    nationalityId: uuid('nationality_id').references(() => catalogNationality.id, { onDelete: 'restrict' }),
    birthDate: date('birth_date'),
    address: text('address'),
    email: text('email'),
    phone: text('phone'),
    bloodType: bloodType('blood_type'),
    cargo: text('cargo'),
    dependencia: text('dependencia'),
    category: rav60Category('category'),
    status: personnelStatus('status').notNull().default('activo'),
    // D5: images in Postgres, compressed by the API to 200 KB at most.
    photo: bytea('photo'),
    photoMime: text('photo_mime'),
    signature: bytea('signature'),
    signatureMime: text('signature_mime'),
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
    check('personal_aeronautico_photo_mime', sql`(${t.photo} is null) = (${t.photoMime} is null)`),
    check('personal_aeronautico_signature_mime', sql`(${t.signature} is null) = (${t.signatureMime} is null)`),
    index('personal_aeronautico_names_lower_idx').on(sql`lower(${t.lastNames})`, sql`lower(${t.firstNames})`),
  ],
)

/** Documents attached to a person's file (D21): PDF or image up to 5 MB. Deleted with the person. */
export const personalAdjunto = pgTable(
  'personal_adjunto',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalId: uuid('personal_id')
      .notNull()
      .references(() => personalAeronautico.id, { onDelete: 'cascade' }),
    attachmentTypeId: uuid('attachment_type_id')
      .notNull()
      .references(() => catalogAttachmentType.id, { onDelete: 'restrict' }),
    filename: text('filename').notNull(),
    mime: text('mime').notNull(),
    data: bytea('data').notNull(),
    size: integer('size').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => usuario.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'personal_adjunto_size',
      sql`${t.size} = octet_length(${t.data}) and ${t.size} between 1 and ${sql.raw(String(ATTACHMENT_MAX_BYTES))}`,
    ),
    index('personal_adjunto_personal_id_idx').on(t.personalId),
  ],
)
