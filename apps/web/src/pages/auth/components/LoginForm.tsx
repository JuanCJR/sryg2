import type { FormEventHandler, RefObject } from 'react'
import { BrandMark, Button, FormField, Input, Notice } from '../../../common/components'
import { LOGIN_FIELD_MESSAGES, type LoginFieldIssues } from '../utils/validation'
import type { LoginNotice } from '../utils/login-notice'
import styles from './LoginForm.module.css'

export interface LoginFormProps {
  email: string
  password: string
  showPassword: boolean
  issues: LoginFieldIssues
  /** Null while there is nothing to report (idle, or field errors already shown inline). */
  notice: LoginNotice | null
  submitting: boolean
  passwordRef: RefObject<HTMLInputElement | null>
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onRetry: () => void
}

/** Presentational sign-in form: the SRYG brand, an inline notice when there is something to report, two fields, the submitting plane row and the actions. */
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
      <div className={styles.brand}>
        <BrandMark size={64} />
        <span className={styles.brandName}>SRYG</span>
      </div>
      <h1 className={styles.title}>Ingresar</h1>
      {notice ? (
        <Notice tone={notice.tone} title={notice.title}>
          {notice.message}
          {notice.countdown ? <span className={styles.countdown}> {notice.countdown}</span> : null}
        </Notice>
      ) : null}
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
        {notice?.retry && !submitting ? (
          <Button type="button" variant="secondary" className={styles.block} onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
      </form>
    </>
  )
}
