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

export interface AccessLogRecord {
  at: Date
  ip: string | null
}

/** Reads a user's own attempts back for /panel and /perfil (D23). */
export interface AccessLogReader {
  /** The latest `limit` attempts of the user with the given outcome, newest first. */
  latest(usuarioId: string, success: boolean, limit: number): Promise<AccessLogRecord[]>
}
