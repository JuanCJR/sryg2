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

/**
 * Multi-value query param: accepts `?k=a,b`, repeated `?k=a&k=b` (string[]) or a single value.
 * Items are trimmed, blanks dropped and duplicates removed; an empty result means "no filter".
 */
export function splitQueryList(value: unknown): unknown {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' && !Array.isArray(value)) return value
  const raw: unknown[] = Array.isArray(value) ? value : [value]
  const items: string[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') return value // let the array schema report the bad item
    for (const part of entry.split(',')) {
      const item = part.trim()
      if (item && !items.includes(item)) items.push(item)
    }
  }
  return items.length ? items : undefined
}

/** A list query param of any item schema (see `splitQueryList`): a non-empty array, or undefined. */
export const csvList = <T extends z.ZodType>(item: T) => z.preprocess(splitQueryList, z.array(item).min(1).optional())

/** A list query param of enum values: `?type=a,b` → `['a', 'b']`. */
export const csvEnum = <const T extends readonly [string, ...string[]]>(values: T) => csvList(z.enum(values))

/** A list query param of UUIDs. */
export const csvUuid = () => csvList(z.uuid())
