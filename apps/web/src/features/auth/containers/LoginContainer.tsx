import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { PATHS } from '../../../app/routes'
import { AuthTemplate } from '../../../app/templates/AuthTemplate'
import { AtcScope } from '../components/AtcScope'
import { AuthPitch } from '../components/AuthPitch'
import { LoginForm } from '../components/LoginForm'
import { noticeFor, type LoginPhase } from '../domain/login-notice'
import { login } from '../domain/login-client'
import { sessionStore } from '../domain/session'
import { validateLogin, type LoginFieldIssues } from '../domain/validation'

/** Counts down from `seconds` once per second; null when there is nothing to wait for. */
function useCountdown(seconds: number | undefined): number | null {
  const [state, setState] = useState<{ seconds: number | undefined; remaining: number | null }>({
    seconds: undefined,
    remaining: null,
  })
  // Reset during render when the source value changes (the documented alternative to an effect).
  if (state.seconds !== seconds) setState({ seconds, remaining: seconds ?? null })

  useEffect(() => {
    if (seconds === undefined) return
    const id = window.setInterval(() => {
      setState((current) => {
        if (current.remaining === null || current.remaining <= 0) return current
        return { ...current, remaining: current.remaining - 1 }
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [seconds])

  return state.remaining
}

export function LoginContainer() {
  const navigate = useNavigate()
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [issues, setIssues] = useState<LoginFieldIssues>({})
  const [phase, setPhase] = useState<LoginPhase>({ kind: 'idle' })

  const remaining = useCountdown(phase.kind === 'throttled' ? phase.retryAfterSeconds : undefined)
  const submitting = phase.kind === 'submitting'

  // After a rejected attempt the password is the likely culprit: put the caret back there.
  useEffect(() => {
    if (phase.kind === 'invalid') passwordRef.current?.focus()
  }, [phase.kind])

  async function attempt() {
    if (submitting) return
    const found = validateLogin({ email, password })
    setIssues(found)
    if (found.email || found.password) {
      setPhase({ kind: 'validation' })
      return
    }
    setPhase({ kind: 'submitting' })
    const outcome = await login({ email, password })
    switch (outcome.kind) {
      case 'success':
        sessionStore.set(outcome.response.accessToken)
        navigate(PATHS.panel, { replace: true })
        return
      case 'throttled':
        setPhase(
          outcome.retryAfterSeconds === undefined
            ? { kind: 'throttled' }
            : { kind: 'throttled', retryAfterSeconds: outcome.retryAfterSeconds },
        )
        return
      case 'validation':
        setPhase({ kind: 'rejected' })
        return
      default:
        setPhase({ kind: outcome.kind })
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void attempt()
  }

  return (
    <AuthTemplate visual={<AtcScope />} pitch={<AuthPitch />}>
      <LoginForm
        email={email}
        password={password}
        showPassword={showPassword}
        issues={issues}
        notice={noticeFor(phase, remaining)}
        submitting={submitting}
        passwordRef={passwordRef}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onTogglePassword={() => setShowPassword((value) => !value)}
        onSubmit={handleSubmit}
        onRetry={() => void attempt()}
      />
    </AuthTemplate>
  )
}
