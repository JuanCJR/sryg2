import { z } from 'zod'
import { RAV67_CLASSES } from './enums'

// Contracts of the medical-certificates module (W1-6). No clinical data (BR-05, D8).
export const rav67ClassSchema = z.enum(RAV67_CLASSES)
