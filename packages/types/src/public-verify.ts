import { z } from 'zod'

/** D9: the public QR check exposes only the kind, the number, the status and the expiry. */
export const publicVerificationSchema = z.object({
  kind: z.enum(['licencia', 'certificado_medico']),
  number: z.string(),
  status: z.enum(['vigente', 'vencida', 'bloqueada']),
  expiryDate: z.iso.date().nullable(),
})
export type PublicVerification = z.infer<typeof publicVerificationSchema>
