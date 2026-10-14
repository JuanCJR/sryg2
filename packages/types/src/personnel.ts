import { z } from 'zod'
import { cedulaSchema } from './cedula'
import { BLOOD_TYPES, PERSONNEL_STATUSES, RAV60_CATEGORIES } from './enums'

const text = z.string().trim().min(1).max(200)

export const personnelSchema = z.object({
  id: z.uuid(),
  cedula: z.string(),
  fullName: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  bloodType: z.enum(BLOOD_TYPES).nullable(),
  cargo: z.string().nullable(),
  dependencia: z.string().nullable(),
  category: z.enum(RAV60_CATEGORIES).nullable(),
  status: z.enum(PERSONNEL_STATUSES),
  photoRef: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type PersonnelDto = z.infer<typeof personnelSchema>

/** Writable fields. `photoRef`, ids and timestamps are server-managed and silently dropped. */
export const createPersonnelSchema = z.object({
  cedula: cedulaSchema,
  fullName: text,
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
