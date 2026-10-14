import { z } from 'zod'
import { roleSchema, userAreaSchema } from './auth'

/** D4: at least 10 characters, no composition rules and no forced rotation. */
export const PASSWORD_MIN_LENGTH = 10
export const newPasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(256)

/** POST /api/auth/change-password (AUTH-08). Clears `mustChangePassword`. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: newPasswordSchema,
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/** One login attempt as shown to its user (D23). */
export const accessLogEntrySchema = z.object({ at: z.iso.datetime(), ip: z.string().nullable() })
export type AccessLogEntry = z.infer<typeof accessLogEntrySchema>

/** GET /api/auth/me/access-log: the latest successful and failed attempts, newest first (D23). */
export const ACCESS_LOG_LIMIT = 5
export const accessLogSchema = z.object({
  successful: z.array(accessLogEntrySchema),
  failed: z.array(accessLogEntrySchema),
})
export type AccessLog = z.infer<typeof accessLogSchema>

const fullNameSchema = z.string().trim().min(1).max(200)

/** POST /api/users (AUTH-06): the API generates the temporary password (D14). */
export const createUserSchema = z.object({
  email: z.email().max(256),
  fullName: fullNameSchema,
  role: roleSchema,
  area: userAreaSchema,
})
export type CreateUserInput = z.infer<typeof createUserSchema>

/** PATCH /api/users/:id: name, role and area only. */
export const updateUserSchema = z
  .object({ fullName: fullNameSchema, role: roleSchema, area: userAreaSchema })
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), { message: 'Nothing to update' })
export type UpdateUserInput = z.infer<typeof updateUserSchema>

/** A user as the Admin sees it: never any password data. */
export const managedUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string(),
  role: roleSchema,
  area: userAreaSchema,
  isActive: z.boolean(),
  mustChangePassword: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ManagedUser = z.infer<typeof managedUserSchema>

/** Length of the temporary passwords the API generates on create and reset (≥ PASSWORD_MIN_LENGTH). */
export const TEMPORARY_PASSWORD_LENGTH = 12

/** Answer to create and reset-password: the temporary password is shown once and never stored in clear. */
export const userCredentialsResponseSchema = z.object({
  user: managedUserSchema,
  temporaryPassword: z.string().min(PASSWORD_MIN_LENGTH),
})
export type UserCredentialsResponse = z.infer<typeof userCredentialsResponseSchema>
