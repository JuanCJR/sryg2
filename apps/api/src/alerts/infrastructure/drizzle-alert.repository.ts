import {
  alerta,
  certificadoMedico,
  type DbExecutor,
  habilitacionClase,
  habilitacionTipo,
  licencia,
  personalAeronautico,
} from '@sryg/db'
import {
  type Alert,
  ALERT_AREAS,
  ALERT_KINDS,
  type AlertKind,
  alertAreaOf,
  type AlertsQuery,
  type AlertsSummary,
  CREDENTIAL_KINDS,
  type CredentialKind,
} from '@sryg/types'
import { and, asc, count, eq, inArray, isNotNull, isNull, lte, type SQL, sql } from 'drizzle-orm'
import type { DesiredAlert, ExpiringCredential } from '../domain/alert'
import type { AlertFilters, AlertRepository } from '../domain/alert-repository'

// Arbitrary constant key of the transaction-level advisory lock taken by the recalculation.
const RECALCULATION_LOCK = 4_101_009
// 5 parameters per row keeps each statement far below Postgres' 65 535 bind parameters.
const CHUNK = 1_000

const a = alerta
const p = personalAeronautico
const alertFields = {
  id: a.id,
  personalId: a.personalId,
  cedula: p.cedula,
  firstNames: p.firstNames,
  lastNames: p.lastNames,
  credentialKind: a.credentialKind,
  credentialId: a.credentialId,
  kind: a.kind,
  dueDate: a.dueDate,
  acknowledgedBy: a.acknowledgedBy,
  acknowledgedAt: a.acknowledgedAt,
  createdAt: a.createdAt,
}
interface AlertRow {
  id: string
  personalId: string
  cedula: string
  firstNames: string
  lastNames: string
  credentialKind: CredentialKind
  credentialId: string
  kind: AlertKind
  dueDate: string
  acknowledgedBy: string | null
  acknowledgedAt: Date | null
  createdAt: Date
}

const toAlert = ({ cedula, firstNames, lastNames, ...row }: AlertRow): Alert => ({
  ...row,
  personnel: { cedula, firstNames, lastNames },
  area: alertAreaOf(row.credentialKind),
  acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
})

const kindsOfAreas = (areas: readonly string[]): CredentialKind[] =>
  CREDENTIAL_KINDS.filter((k) => areas.includes(alertAreaOf(k)))

function chunks<T>(items: readonly T[]): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += CHUNK) result.push(items.slice(i, i + CHUNK))
  return result
}

export class DrizzleAlertRepository implements AlertRepository {
  constructor(private readonly executor: DbExecutor) {}

  async lockForRecalculation(): Promise<void> {
    // DbExecutor exposes no raw `execute`: selecting the function from a one-row subquery calls it.
    await this.executor
      .select({ locked: sql`pg_advisory_xact_lock(${RECALCULATION_LOCK})` })
      .from(sql`(select 1) as lock`)
  }

  async findExpiringCredentials(until: string): Promise<ExpiringCredential[]> {
    const licenses = await this.executor
      .select({ personalId: licencia.personalId, credentialId: licencia.id, expiryDate: licencia.expiryDate })
      .from(licencia)
      // D20: a license without expiry never raises an alert.
      .where(and(isNotNull(licencia.expiryDate), lte(licencia.expiryDate, until)))
    const typeRatings = await this.executor
      .select({
        personalId: licencia.personalId,
        credentialId: habilitacionTipo.id,
        expiryDate: habilitacionTipo.expiryDate,
      })
      .from(habilitacionTipo)
      .innerJoin(licencia, eq(licencia.id, habilitacionTipo.licenciaId))
      .where(lte(habilitacionTipo.expiryDate, until))
    const classRatings = await this.executor
      .select({
        personalId: licencia.personalId,
        credentialId: habilitacionClase.id,
        expiryDate: habilitacionClase.expiryDate,
      })
      .from(habilitacionClase)
      .innerJoin(licencia, eq(licencia.id, habilitacionClase.licenciaId))
      .where(lte(habilitacionClase.expiryDate, until))
    const certificates = await this.executor
      .select({
        personalId: certificadoMedico.personalId,
        credentialId: certificadoMedico.id,
        expiryDate: certificadoMedico.expiryDate,
      })
      .from(certificadoMedico)
      .where(lte(certificadoMedico.expiryDate, until))
    return [
      ...licenses.map((r) => ({ ...r, expiryDate: r.expiryDate!, credentialKind: 'licencia' as const })),
      ...typeRatings.map((r) => ({ ...r, credentialKind: 'habilitacion_tipo' as const })),
      ...classRatings.map((r) => ({ ...r, credentialKind: 'habilitacion_clase' as const })),
      ...certificates.map((r) => ({ ...r, credentialKind: 'certificado_medico' as const })),
    ]
  }

  async sync(desired: readonly DesiredAlert[]): Promise<{ created: number; updated: number; removed: number }> {
    const existing = await this.executor
      .select({ id: a.id, credentialId: a.credentialId, kind: a.kind, dueDate: a.dueDate, personalId: a.personalId })
      .from(a)
    const key = (row: { credentialId: string; kind: string }) => `${row.credentialId}:${row.kind}`
    const byKey = new Map(existing.map((row) => [key(row), row]))
    const wanted = new Set(desired.map(key))

    const toInsert = desired.filter((d) => !byKey.has(key(d)))
    const toUpdate = desired.filter((d) => {
      const row = byKey.get(key(d))
      return row && (row.dueDate !== d.dueDate || row.personalId !== d.personalId)
    })
    const toRemove = existing.filter((row) => !wanted.has(key(row))).map((row) => row.id)

    for (const batch of chunks(toRemove)) await this.executor.delete(a).where(inArray(a.id, batch))
    for (const batch of chunks(toInsert)) {
      // A concurrent writer outside the lock cannot exist, but never fail the recalculation on it.
      await this.executor.insert(a).values(batch).onConflictDoNothing()
    }
    for (const d of toUpdate) {
      const row = byKey.get(key(d))!
      const reopen = row.dueDate !== d.dueDate
      await this.executor
        .update(a)
        .set({
          personalId: d.personalId,
          dueDate: d.dueDate,
          // A new due date is a new situation: the earlier acknowledgement no longer applies.
          ...(reopen ? { acknowledgedBy: null, acknowledgedAt: null } : {}),
        })
        .where(eq(a.id, row.id))
    }
    return { created: toInsert.length, updated: toUpdate.length, removed: toRemove.length }
  }

  async list({ page, pageSize, ...filters }: AlertsQuery) {
    const where = this.where(filters)
    const [items, [totals]] = await Promise.all([
      this.executor
        .select(alertFields)
        .from(a)
        .innerJoin(p, eq(p.id, a.personalId))
        .where(where)
        .orderBy(asc(a.dueDate), asc(a.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.executor.select({ total: count() }).from(a).where(where),
    ])
    return { items: items.map(toAlert), page, pageSize, total: totals?.total ?? 0 }
  }

  async summary(filters: AlertFilters): Promise<AlertsSummary> {
    const acknowledged = sql<boolean>`(${a.acknowledgedAt} is not null)`
    const rows = await this.executor
      .select({ kind: a.kind, credentialKind: a.credentialKind, acknowledged, total: count() })
      .from(a)
      .where(this.where(filters))
      .groupBy(a.kind, a.credentialKind, acknowledged)
    const summary: AlertsSummary = {
      total: 0,
      byKind: Object.fromEntries(ALERT_KINDS.map((k) => [k, 0])) as AlertsSummary['byKind'],
      byAcknowledgement: { pending: 0, acknowledged: 0 },
      byCredentialKind: Object.fromEntries(CREDENTIAL_KINDS.map((k) => [k, 0])) as AlertsSummary['byCredentialKind'],
      byArea: Object.fromEntries(ALERT_AREAS.map((k) => [k, 0])) as AlertsSummary['byArea'],
    }
    for (const row of rows) {
      summary.total += row.total
      summary.byKind[row.kind] += row.total
      summary.byAcknowledgement[row.acknowledged ? 'acknowledged' : 'pending'] += row.total
      summary.byCredentialKind[row.credentialKind] += row.total
      summary.byArea[alertAreaOf(row.credentialKind)] += row.total
    }
    return summary
  }

  async findById(id: string): Promise<Alert | null> {
    const [row] = await this.executor
      .select(alertFields)
      .from(a)
      .innerJoin(p, eq(p.id, a.personalId))
      .where(eq(a.id, id))
      .limit(1)
    return row ? toAlert(row) : null
  }

  async acknowledge(id: string, actorId: string, at: Date): Promise<Alert | null> {
    const [row] = await this.executor
      .update(a)
      .set({ acknowledgedBy: actorId, acknowledgedAt: at })
      .where(and(eq(a.id, id), isNull(a.acknowledgedAt)))
      .returning({ id: a.id })
    return row ? this.findById(row.id) : null
  }

  private where({ kind, acknowledged, area, credentialKind, personalId }: AlertFilters): SQL | undefined {
    return and(
      kind ? inArray(a.kind, kind) : undefined,
      acknowledged === undefined ? undefined : acknowledged ? isNotNull(a.acknowledgedAt) : isNull(a.acknowledgedAt),
      area ? inArray(a.credentialKind, kindsOfAreas(area)) : undefined,
      credentialKind ? inArray(a.credentialKind, credentialKind) : undefined,
      personalId ? eq(a.personalId, personalId) : undefined,
    )
  }
}
