import { z } from 'zod'
import { RAV60_CATEGORIES } from './enums'

// Contracts of the licenses module (W1-5).
export const rav60CategorySchema = z.enum(RAV60_CATEGORIES)
