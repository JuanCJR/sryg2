import { z } from 'zod'

export const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
export type ListQuery = z.infer<typeof listQuerySchema>

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number }

export const apiErrorSchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
})
export type ApiError = z.infer<typeof apiErrorSchema>

export type HealthResponse = { status: 'ok'; db?: 'up' }
