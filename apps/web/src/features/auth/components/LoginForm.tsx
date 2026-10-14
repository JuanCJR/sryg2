import type { FormEventHandler, RefObject } from 'react'
import { Button, FormField, Input, Notice } from '../../../design-system'
import { LOGIN_FIELD_MESSAGES, type LoginFieldIssues } from '../domain/validation'
import type { LoginNotice } from '../domain/login-notice'
import styles from './LoginForm.module.css'

export interface LoginFormProps {
  email: string
  password: string
  showPassword: boolean
  issues: LoginFieldIssues
  notice: LoginNotice
  submitting: boolean
  passwordRef: RefObject<HTMLInputElement | null>
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onRetry: () => void
}

/** Presentational sign-in form: a fixed-height notice slot, two fields, the submitting plane row and the actions. */
export function LoginForm({
  email,
  password,
  showPassword,
  issues,
  notice,
  submitting,
  passwordRef,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onRetry,
}: LoginFormProps) {
  return (
    <>
      <h1 className={styles.title}>Ingresar</h1>
      <div className={styles.slot}>
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}
          {notice.countdown ? <span className={styles.countdown}> {notice.countdown}</span> : null}
        </Notice>
      </div>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <FormField label="Correo" error={issues.email ? LOGIN_FIELD_MESSAGES.email[issues.email] : undefined}>
          {(control) => (
            <Input
              {...control}
              type="email"
              name="email"
              autoComplete="username"
              placeholder="nombre@dominio"
              value={email}
              disabled={submitting}
              onChange={(event) => onEmailChange(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Contraseña"
          error={issues.password ? LOGIN_FIELD_MESSAGES.password[issues.password] : undefined}
        >
          {(control) => (
            <div className={styles.passwordWrap}>
              <Input
                {...control}
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                className={styles.passwordInput}
                value={password}
                disabled={submitting}
                onChange={(event) => onPasswordChange(event.target.value)}
              />
              <button
                type="button"
                className={styles.reveal}
                onClick={onTogglePassword}
                disabled={submitting}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          )}
        </FormField>
        {submitting ? (
          <div className={styles.progress} aria-hidden="true">
            <div className={styles.planes} />
            <span className={styles.progressLabel}>Verificando…</span>
          </div>
        ) : null}
        <span className="visually-hidden" role="status" aria-live="polite">
          {submitting ? 'Verificando credenciales' : ''}
        </span>
        <Button type="submit" className={styles.block} disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
        {notice.retry && !submitting ? (
          <Button type="button" variant="secondary" className={styles.block} onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
      </form>
    </>
  )
}
