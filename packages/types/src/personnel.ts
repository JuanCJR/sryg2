import { z } from 'zod'
import { cedulaSchema } from './cedula'
import { BLOOD_TYPES, PERSONNEL_STATUSES, RAV60_CATEGORIES } from './enums'

const text = z.string().trim().min(1).max(200)
export const isoDateSchema = z.iso.date()

export const personnelSchema = z.object({
  id: z.uuid(),
  cedula: z.string(),
  firstNames: z.string(),
  lastNames: z.string(),
  documentTypeId: z.uuid().nullable(),
  nationalityId: z.uuid().nullable(),
  birthDate: isoDateSchema.nullable(),
  address: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  bloodType: z.enum(BLOOD_TYPES).nullable(),
  cargo: z.string().nullable(),
  dependencia: z.string().nullable(),
  category: z.enum(RAV60_CATEGORIES).nullable(),
  status: z.enum(PERSONNEL_STATUSES),
  /** The images themselves are served by their own endpoints (D5, W1-4), never inlined. */
  hasPhoto: z.boolean(),
  hasSignature: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type PersonnelDto = z.infer<typeof personnelSchema>

/** Writable fields (D21). Photo, signature, ids and timestamps are server-managed and silently dropped. */
export const createPersonnelSchema = z.object({
  cedula: cedulaSchema,
  firstNames: text,
  lastNames: text,
  documentTypeId: z.uuid().nullish(),
  nationalityId: z.uuid().nullish(),
  birthDate: isoDateSchema.nullish(),
  address: z.string().trim().min(1).max(500).nullish(),
  email: z.email().nullish(),
  phone: text.nullish(),
  bloodType: z.enum(BLOOD_TYPES).nullish(),
  cargo: text.nullish(),
  dependencia: text.nullish(),
  category: z.enum(RAV60_CATEGORIES).nullish(),
  status: z.enum(PERSONNEL_STATUSES).optional(),
})
export type CreatePersonnelInput = z.infer<typeof createPersonnelSchema>

export const updatePersonnelSchema = createPersonnelSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'At least one field is required')
export type UpdatePersonnelInput = z.infer<typeof updatePersonnelSchema>
