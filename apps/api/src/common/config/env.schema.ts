import Joi from 'joi'

export interface Env {
  NODE_ENV: 'development' | 'test' | 'production'
  PORT: number
  DATABASE_URL: string
  JWT_SECRET: string
  JWT_TTL_SECONDS: number
  CORS_ORIGIN: string
  /** CORS_ORIGIN split into exact origins. */
  CORS_ORIGINS: string[]
  LOGIN_THROTTLE_LIMIT: number
  LOGIN_THROTTLE_TTL: number
}

const MIN_JWT_SECRET_BYTES = 32

const isOrigin = (value: string) => {
  try {
    return new URL(value).origin === value
  } catch {
    return false
  }
}

// Dashboards often paste origins with quotes or a trailing slash; both are harmless, so strip them.
const stripQuotes = (value: string) => value.trim().replace(/^["']|["']$/g, '')
const normalizeOrigin = (origin: string) => stripQuotes(origin).replace(/\/+$/, '')

const corsOrigin = Joi.string()
  .custom((value: string, helpers) => {
    const origins = stripQuotes(value).split(',').map(normalizeOrigin).filter(Boolean)
    if (origins.length === 0) return helpers.error('any.invalid')
    const production = helpers.state.ancestors[0]?.NODE_ENV === 'production'
    for (const origin of origins) {
      if (!isOrigin(origin) || (production && !origin.startsWith('https://'))) return helpers.error('any.invalid')
    }
    return origins.join(',')
  }, 'comma-separated exact origins (https in production)')
  .messages({
    'any.invalid':
      '{{#label}} must be comma-separated origins like https://host (scheme + lowercase host, no path; https in production)',
  })

export const envSchema = Joi.object<Env>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  JWT_SECRET: Joi.string()
    .required()
    .custom((value: string, helpers) =>
      Buffer.byteLength(value, 'utf8') >= MIN_JWT_SECRET_BYTES ? value : helpers.error('string.min', { limit: 32 }),
    )
    .messages({ 'string.min': '{{#label}} must be at least {{#limit}} bytes' }),
  JWT_TTL_SECONDS: Joi.number().integer().min(1).default(3600),
  CORS_ORIGIN: corsOrigin.required(),
  LOGIN_THROTTLE_LIMIT: Joi.number().integer().min(1).default(5),
  LOGIN_THROTTLE_TTL: Joi.number().integer().min(1).default(60),
}).unknown(true)

/** Validates raw env and returns typed values; the error message names every invalid variable. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const { value, error } = envSchema.validate(raw, { abortEarly: false })
  if (error)
    throw new Error(`Invalid environment configuration:\n${error.details.map((d) => `  - ${d.message}`).join('\n')}`)
  return { ...value, CORS_ORIGINS: String(value.CORS_ORIGIN).split(',') }
}
