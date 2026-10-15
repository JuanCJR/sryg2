import { PASSWORD_MIN_LENGTH } from '@sryg/types'

export interface PasswordChangeForm {
  current: string
  next: string
  confirm: string
}

export interface PasswordChangeIssues {
  current?: string
  next?: string
  confirm?: string
}

/** Client-side check before any request (D4: at least 10 characters, no composition rules). */
export function validatePasswordChange({ current, next, confirm }: PasswordChangeForm): PasswordChangeIssues {
  const issues: PasswordChangeIssues = {}
  if (current === '') issues.current = 'Escriba su contraseña actual.'
  if (next.length < PASSWORD_MIN_LENGTH) issues.next = `Use al menos ${PASSWORD_MIN_LENGTH} caracteres.`
  if (confirm !== next) issues.confirm = 'Las contraseñas no coinciden.'
  return issues
}

export const WRONG_CURRENT_PASSWORD = 'La contraseña actual no es correcta.'
