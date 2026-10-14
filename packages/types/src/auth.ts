import { z } from 'zod'
import { ROLES, USER_AREAS } from './enums'

export const roleSchema = z.enum(ROLES)
export const userAreaSchema = z.enum(USER_AREAS)

export const loginRequestSchema = z.object({ email: z.email(), password: z.string().min(1).max(256) })
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const authUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  fullName: z.string(),
  role: roleSchema,
  area: userAreaSchema,
  /** Set after an Admin reset (D4): the web sends the user to /perfil until it is cleared. */
  mustChangePassword: z.boolean(),
})
export type AuthUser = z.infer<typeof authUserSchema>

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
  user: authUserSchema,
})
export type LoginResponse = z.infer<typeof loginResponseSchema>
