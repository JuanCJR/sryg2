import { z } from 'zod'

// Cedula is stored as digits only (no nationality, licenses are for Venezuelan nationals).
export const CEDULA_PATTERN = /^\d{6,9}$/

/** Strips a leading "V"/"V-" and any whitespace, dots or hyphens. Does not validate. */
export function normalizeCedula(input: string): string {
  return input
    .trim()
    .replace(/^v[\s.-]*/i, '')
    .replace(/[\s.-]/g, '')
}

export const cedulaSchema = z
  .string()
  .transform(normalizeCedula)
  .pipe(z.string().regex(CEDULA_PATTERN, 'Cedula must contain 6 to 9 digits'))
