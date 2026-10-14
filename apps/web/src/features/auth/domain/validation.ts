import { loginRequestSchema } from '@sryg/types'

export type FieldIssue = 'required' | 'invalid'

export interface LoginFieldIssues {
  email?: FieldIssue
  password?: FieldIssue
}

export const LOGIN_FIELD_MESSAGES = {
  email: { required: 'Ingrese su correo.', invalid: 'Ingrese un correo válido, por ejemplo nombre@dominio.' },
  password: { required: 'Ingrese su contraseña.', invalid: 'Ingrese su contraseña.' },
} as const satisfies Record<'email' | 'password', Record<FieldIssue, string>>

/** Client-side check before any request. The email format reuses the API contract's own rule. */
export function validateLogin(input: { email: string; password: string }): LoginFieldIssues {
  const issues: LoginFieldIssues = {}
  const email = input.email.trim()
  if (email === '') issues.email = 'required'
  else if (!loginRequestSchema.shape.email.safeParse(email).success) issues.email = 'invalid'
  if (input.password === '') issues.password = 'required'
  return issues
}
