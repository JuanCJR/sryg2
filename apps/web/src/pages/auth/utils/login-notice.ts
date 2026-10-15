export type LoginPhase =
  | { kind: 'idle' }
  | { kind: 'validation' }
  | { kind: 'submitting' }
  | { kind: 'invalid' }
  | { kind: 'throttled'; retryAfterSeconds?: number }
  | { kind: 'unreachable' }
  | { kind: 'rejected' }

export type LoginNoticeTone = 'info' | 'warning' | 'caution'

export interface LoginNotice {
  tone: LoginNoticeTone
  title: string
  message: string
  /** Formatted m:ss, only when the API said how long to wait. */
  countdown?: string
  retry?: boolean
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Copy and tone of the inline notice for each phase of the sign-in form. Null when there is nothing to report:
 * before any attempt, after client validation (the field errors speak for themselves) and once a throttle wait ends.
 */
export function noticeFor(phase: LoginPhase, remainingSeconds: number | null): LoginNotice | null {
  switch (phase.kind) {
    case 'idle':
    case 'validation':
      return null
    case 'submitting':
      return { tone: 'info', title: 'Verificando credenciales', message: 'Comprobando sus credenciales…' }
    case 'invalid':
      // Identical for a wrong password and an unknown email: never reveal which one failed.
      return {
        tone: 'warning',
        title: 'Credenciales no válidas',
        message: 'Verifique el correo y la contraseña e intente de nuevo.',
      }
    case 'throttled': {
      if (phase.retryAfterSeconds === undefined || remainingSeconds === null) {
        return { tone: 'caution', title: 'Demasiados intentos', message: 'Espere unos minutos.' }
      }
      if (remainingSeconds <= 0) return null
      return {
        tone: 'caution',
        title: 'Demasiados intentos',
        message: 'Espere para volver a intentar.',
        countdown: formatCountdown(remainingSeconds),
      }
    }
    case 'unreachable':
      return {
        tone: 'caution',
        title: 'Sin conexión con el servidor',
        message: 'Verifique la red local e intente de nuevo.',
        retry: true,
      }
    case 'rejected':
      return {
        tone: 'caution',
        title: 'Datos no válidos',
        message: 'Revise el correo y la contraseña e intente de nuevo.',
      }
  }
}
