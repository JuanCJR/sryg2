import type { CredentialStatus } from '../../../design-system'
import { worstStatus } from '../../../design-system'
import { DEMO_NEAR_EXPIRY_DAYS } from './config'
import type { ExpedienteData, PageKeyId, Warning } from './types'

const MS_PER_DAY = 1000 * 60 * 60 * 24

function atMidnightUtc(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Whole days between `today` and the ISO date (negative if the date is in the past). */
export function daysUntil(iso: string, today: Date): number {
  const target = atMidnightUtc(new Date(iso))
  const base = atMidnightUtc(today)
  return Math.round((target - base) / MS_PER_DAY)
}

/** A credential's own status from its expiry alone — never affected by a block. */
export function deriveOwnStatus(vence: string, today: Date, nearExpiryDays = DEMO_NEAR_EXPIRY_DAYS): CredentialStatus {
  const remaining = daysUntil(vence, today)
  if (remaining < 0) {
    return 'vencida'
  }
  if (remaining <= nearExpiryDays) {
    return 'proxima'
  }
  return 'activa'
}

/** The status actually shown: a block overrides an otherwise-fine own status. */
export function effectiveStatus(ownStatus: CredentialStatus, blockedById: string | undefined): CredentialStatus {
  return blockedById ? 'bloqueada' : ownStatus
}

function dueLabel(daysRemaining: number): string {
  return daysRemaining < 0 ? `hace ${Math.abs(daysRemaining)} d` : `${daysRemaining} d`
}

function dueSentence(daysRemaining: number): string {
  if (daysRemaining === 0) {
    return 'Vence hoy.'
  }
  if (daysRemaining < 0) {
    const n = Math.abs(daysRemaining)
    return `Venció hace ${n} ${n === 1 ? 'día' : 'días'}.`
  }
  return `Vence en ${daysRemaining} ${daysRemaining === 1 ? 'día' : 'días'}.`
}

/** Worst status among the credentials shown on one expediente page — undefined when nothing is wrong. */
export function worstStatusForPage(pageId: PageKeyId, data: ExpedienteData, today: Date): CredentialStatus | undefined {
  switch (pageId) {
    case 'licencias':
      return worstStatus([effectiveStatus(data.licencia.ownStatus, data.licencia.bloqueadaPorId)])
    case 'habilitaciones':
      return worstStatus(data.habilitaciones.map((h) => deriveOwnStatus(h.vence, today)))
    case 'medico':
      return worstStatus([deriveOwnStatus(data.certificado.vence, today)])
    case 'bloqueos':
      return data.bloqueos.some((b) => b.estado === 'abierto') ? 'bloqueada' : undefined
    default:
      return undefined
  }
}

function pageProblemLamp(status: CredentialStatus | undefined): CredentialStatus | undefined {
  return status && status !== 'activa' ? status : undefined
}

export function pageKeyProblems(data: ExpedienteData, today: Date): Partial<Record<PageKeyId, CredentialStatus>> {
  const pages: PageKeyId[] = ['licencias', 'habilitaciones', 'medico', 'bloqueos']
  const result: Partial<Record<PageKeyId, CredentialStatus>> = {}
  for (const page of pages) {
    const lamp = pageProblemLamp(worstStatusForPage(page, data, today))
    if (lamp) {
      result[page] = lamp
    }
  }
  return result
}

const STATUS_PRIORITY: Record<CredentialStatus, number> = {
  bloqueada: 0,
  vencida: 1,
  proxima: 2,
  activa: 3,
}

export interface CriticalCredential {
  status: CredentialStatus
  /** Days remaining (negative if overdue) for this specific credential. */
  diasRestantes: number
  /** e.g. "Licencia — Piloto comercial" — never an invented regulatory number, only existing domain fields. */
  label: string
}

/**
 * Picks the credential driving a person's overall row status for the Listado's "credencial más
 * crítica" column: the worst among the licencia, every habilitación, and the certificado médico.
 * Ties resolve licencia > habilitación > certificado (declaration order) — arbitrary but stable.
 */
export function pickCriticalCredential(data: ExpedienteData, today: Date): CriticalCredential {
  const candidates: CriticalCredential[] = [
    {
      status: effectiveStatus(data.licencia.ownStatus, data.licencia.bloqueadaPorId),
      diasRestantes: daysUntil(data.licencia.vence, today),
      label: `Licencia — ${data.licencia.tipo}`,
    },
    ...data.habilitaciones.map((hab) => ({
      status: effectiveStatus(deriveOwnStatus(hab.vence, today), hab.bloqueadaPorId),
      diasRestantes: daysUntil(hab.vence, today),
      label: `Habilitación — ${hab.nombre}`,
    })),
    {
      status: deriveOwnStatus(data.certificado.vence, today),
      diasRestantes: daysUntil(data.certificado.vence, today),
      label: `Certificado médico — ${data.certificado.tipo}`,
    },
  ]
  return candidates.reduce((worst, current) =>
    STATUS_PRIORITY[current.status] < STATUS_PRIORITY[worst.status] ? current : worst,
  )
}

/** Derives the ordered warning stack: block first, then overdue, then near-expiry, most urgent first within each. */
export function deriveWarnings(data: ExpedienteData, today: Date): Warning[] {
  const warnings: Warning[] = []
  const { licencia, habilitaciones, certificado, bloqueos } = data

  // Only an 'abierto' block counts — a bloqueadaPorId pointing at a resolved (stale) block must never warn.
  const openBlocks = bloqueos.filter((b) => b.estado === 'abierto')
  const licenciaBlock = licencia.bloqueadaPorId ? openBlocks.find((b) => b.id === licencia.bloqueadaPorId) : undefined
  if (licenciaBlock) {
    const daysOpen = daysUntil(licenciaBlock.registradoEn, today)
    const affectedRatings = habilitaciones.filter((h) => h.bloqueadaPorId === licenciaBlock.id).length
    warnings.push({
      id: `warning-${licenciaBlock.id}`,
      status: 'bloqueada',
      title: `BLOQUEO ${licenciaBlock.id} ABIERTO · EMISIÓN IMPEDIDA`,
      detail: `${licenciaBlock.motivo}. Detiene 1 licencia y ${affectedRatings} habilitaciones.`,
      page: 'licencias',
      relativeLabel: dueLabel(daysOpen),
      linkedRowIds: [licencia.id],
      daysUntilDue: daysOpen,
    })
  }

  for (const hab of habilitaciones) {
    const ownStatus = deriveOwnStatus(hab.vence, today)
    if (ownStatus === 'activa') {
      continue
    }
    const remaining = daysUntil(hab.vence, today)
    warnings.push({
      id: `warning-${hab.id}`,
      status: ownStatus,
      title:
        ownStatus === 'vencida'
          ? `HABILITACIÓN VENCIDA · ${hab.nombre.toUpperCase()}`
          : `HABILITACIÓN PRÓXIMA A VENCER · ${hab.nombre.toUpperCase()}`,
      detail: dueSentence(remaining),
      page: 'habilitaciones',
      relativeLabel: dueLabel(remaining),
      linkedRowIds: [hab.id],
      daysUntilDue: remaining,
    })
  }

  const medStatus = deriveOwnStatus(certificado.vence, today)
  if (medStatus !== 'activa') {
    const remaining = daysUntil(certificado.vence, today)
    warnings.push({
      id: `warning-${certificado.id}`,
      status: medStatus,
      title:
        medStatus === 'vencida'
          ? `CERTIFICADO MÉDICO VENCIDO · ${certificado.tipo.toUpperCase()}`
          : `CERTIFICADO MÉDICO PRÓXIMO A VENCER · ${certificado.tipo.toUpperCase()}`,
      detail: dueSentence(remaining),
      page: 'medico',
      relativeLabel: dueLabel(remaining),
      linkedRowIds: [certificado.id],
      daysUntilDue: remaining,
    })
  }

  return warnings.sort((a, b) => {
    const priorityDiff = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
    if (priorityDiff !== 0) {
      return priorityDiff
    }
    return a.daysUntilDue - b.daysUntilDue
  })
}
