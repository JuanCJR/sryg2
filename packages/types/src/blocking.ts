import { z } from 'zod'
import { listQuerySchema } from './common'
import { BLOCK_STATUSES, BLOCK_TYPES } from './enums'

// Contracts of the validation-blocking module (W1-3).
export const blockTypeSchema = z.enum(BLOCK_TYPES)
export const blockStatusSchema = z.enum(BLOCK_STATUSES)

const note = z.string().trim().min(1).max(1000)
const userRefSchema = z.object({ id: z.uuid(), fullName: z.string() })

export const blockSchema = z.object({
  id: z.uuid(),
  personalId: z.uuid(),
  /** Enough of the person to list blocks without a second request. */
  person: z.object({ cedula: z.string(), firstNames: z.string(), lastNames: z.string() }),
  type: blockTypeSchema,
  reason: z.string(),
  status: blockStatusSchema,
  createdBy: userRefSchema,
  createdAt: z.iso.datetime(),
  resolvedBy: userRefSchema.nullable(),
  resolvedAt: z.iso.datetime().nullable(),
  resolutionNote: z.string().nullable(),
  updatedAt: z.iso.datetime(),
})
export type BlockDto = z.infer<typeof blockSchema>

/** A block is always registered active; status and resolution are server-managed and silently dropped. */
export const createBlockSchema = z.object({
  personalId: z.uuid(),
  type: blockTypeSchema,
  reason: note,
})
export type CreateBlockInput = z.infer<typeof createBlockSchema>

/** BR-08: lifting a block requires a written resolution. */
export const resolveBlockSchema = z.object({ resolutionNote: note })
export type ResolveBlockInput = z.infer<typeof resolveBlockSchema>

/** `q` searches the person by name or cédula; `personalId` narrows to one person (the Expediente). */
export const listBlocksQuerySchema = listQuerySchema.extend({
  status: blockStatusSchema.optional(),
  type: blockTypeSchema.optional(),
  personalId: z.uuid().optional(),
})
export type ListBlocksQuery = z.infer<typeof listBlocksQuerySchema>
