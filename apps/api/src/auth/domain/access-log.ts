/** One login attempt (D23). `usuarioId` is set whenever the identifier matches a user, also on failure. */
export interface AccessAttempt {
  usuarioId: string | null
  /** Normalized (trimmed, lower-case) identifier that was typed. */
  identifier: string
  ip: string | null
  success: boolean
}

export interface AccessLog {
  record(attempt: AccessAttempt): Promise<void>
}
