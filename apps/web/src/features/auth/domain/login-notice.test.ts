import { describe, expect, it } from 'vitest'
import { formatCountdown, noticeFor } from './login-notice'

describe('formatCountdown', () => {
  it('formats seconds as m:ss', () => {
    expect(formatCountdown(42)).toBe('0:42')
    expect(formatCountdown(5)).toBe('0:05')
    expect(formatCountdown(125)).toBe('2:05')
    expect(formatCountdown(0)).toBe('0:00')
  })
})

describe('noticeFor', () => {
  it('is a quiet info notice while idle, and for client validation', () => {
    expect(noticeFor({ kind: 'idle' }, null)).toMatchObject({ tone: 'info', title: 'Listo' })
    expect(noticeFor({ kind: 'validation' }, null)).toMatchObject({ tone: 'info', title: 'Listo' })
  })

  it('reports verification while submitting', () => {
    expect(noticeFor({ kind: 'submitting' }, null)).toMatchObject({ tone: 'info', title: 'Verificando credenciales' })
  })

  it('uses one red notice for invalid credentials, never saying which field was wrong', () => {
    const notice = noticeFor({ kind: 'invalid' }, null)
    expect(notice).toMatchObject({ tone: 'warning', title: 'Credenciales no válidas' })
    expect(notice.message).not.toMatch(/contraseña incorrecta|correo no existe|no registrado/i)
  })

  it('shows a countdown only when the server gave Retry-After', () => {
    expect(noticeFor({ kind: 'throttled' }, null)).toMatchObject({
      tone: 'caution',
      title: 'Demasiados intentos',
      message: 'Espere unos minutos.',
    })
    expect(noticeFor({ kind: 'throttled' }, null).countdown).toBeUndefined()
    expect(noticeFor({ kind: 'throttled', retryAfterSeconds: 42 }, 42)).toMatchObject({ countdown: '0:42' })
  })

  it('falls back to idle once the countdown reaches zero', () => {
    expect(noticeFor({ kind: 'throttled', retryAfterSeconds: 42 }, 0)).toMatchObject({ tone: 'info', title: 'Listo' })
  })

  it('offers a retry when the server is unreachable', () => {
    expect(noticeFor({ kind: 'unreachable' }, null)).toMatchObject({
      tone: 'caution',
      title: 'Sin conexión con el servidor',
      retry: true,
    })
  })

  it('asks to review the data on a server-side 400', () => {
    expect(noticeFor({ kind: 'rejected' }, null)).toMatchObject({ tone: 'caution', title: 'Datos no válidos' })
  })
})
