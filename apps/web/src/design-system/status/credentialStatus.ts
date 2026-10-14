export type CredentialStatus = 'activa' | 'proxima' | 'vencida' | 'bloqueada'

export type StatusSeverity = 'normal' | 'caution' | 'warning'

// OD-07: blocked-state name unresolved ("Bloqueada" vs "Suspendida") — the single token to change when INAC confirms.
export const BLOCKED_STATE_LABEL = 'Bloqueada'

export interface StatusMeta {
  label: string
  severity: StatusSeverity
  /** Lower priority sorts first — the warning stack always leads with 0. */
  priority: number
}

export const STATUS_META: Record<CredentialStatus, StatusMeta> = {
  bloqueada: { label: BLOCKED_STATE_LABEL, severity: 'warning', priority: 0 },
  vencida: { label: 'Vencida', severity: 'warning', priority: 1 },
  proxima: { label: 'Próxima a vencer', severity: 'caution', priority: 2 },
  activa: { label: 'Activa', severity: 'normal', priority: 3 },
}

/** The single worst (lowest-priority-number) status among the given set, if any. */
export function worstStatus(statuses: CredentialStatus[]): CredentialStatus | undefined {
  if (statuses.length === 0) {
    return undefined
  }
  return statuses.reduce((worst, current) =>
    STATUS_META[current].priority < STATUS_META[worst].priority ? current : worst,
  )
}
