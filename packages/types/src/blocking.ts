import { z } from 'zod'
import { BLOCK_STATUSES, BLOCK_TYPES } from './enums'

// Contracts of the validation-blocking module (W1-3).
export const blockTypeSchema = z.enum(BLOCK_TYPES)
export const blockStatusSchema = z.enum(BLOCK_STATUSES)
