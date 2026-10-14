import { z } from 'zod'
import { ROLES } from './enums'

export const roleSchema = z.enum(ROLES)

export const loginRequestSchema = z.object({ email: z.email(), password: z.string().min(1).max(256) })
export type LoginRequest = z.infer<typeof loginRequestSchema>

export const authUserSchema = z.object({ id: z.uuid(), email: z.email(), fullName: z.string(), role: roleSchema })
export type AuthUser = z.infer<typeof authUserSchema>

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
  user: authUserSchema,
})
export type LoginResponse = z.infer<typeof loginResponseSchema>
