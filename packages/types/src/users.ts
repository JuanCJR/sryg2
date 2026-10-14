import { z } from 'zod'

/** D4: at least 10 characters, no composition rules and no forced rotation. */
export const PASSWORD_MIN_LENGTH = 10
export const newPasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(256)
