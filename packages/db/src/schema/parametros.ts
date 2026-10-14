import { boolean, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { bytea } from './bytea'
import { graphicResourceKind } from './enums'
import { timestamps } from './timestamps'
import { usuario } from './usuario'

/** Editable parameters (D3): alert threshold and validity per RAV 67 class. Keys live in @sryg/types. */
export const parametroSistema = pgTable('parametro_sistema', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  // D3: shown as "PENDIENTE INAC" until the Admin saves a value.
  isPlaceholder: boolean('is_placeholder').notNull().default(true),
  updatedBy: uuid('updated_by').references(() => usuario.id, { onDelete: 'restrict' }),
  ...timestamps,
})

/** INAC logo and the President's signature for the credential PDF (D18). */
export const recursoGrafico = pgTable('recurso_grafico', {
  kind: graphicResourceKind('kind').primaryKey(),
  data: bytea('data').notNull(),
  mime: text('mime').notNull(),
  updatedBy: uuid('updated_by').references(() => usuario.id, { onDelete: 'restrict' }),
  ...timestamps,
})
