import {
  type ActiveBlockReportRow,
  type ConsolidatedReportRow,
  type CredentialKind,
  type DerivedCredentialStatus,
  deriveCredentialStatus,
  type ExpiryReportRow,
  NO_CREDENTIALS_STATUS,
  type Rav67Class,
  type ReportFilters,
  worstCredentialStatus,
} from '@sryg/types'
import type { LicenseRecord, MedicalRecord, PersonRecord, ReportDataset } from './report-dataset'

/** What a status depends on besides the credential: the day, the threshold (D3) and the active blocks. */
export interface StatusContext {
  /** `YYYY-MM-DD`. */
  today: string
  thresholdDays: number
  blockedPersonIds: ReadonlySet<string>
}

const DAY_MS = 86_400_000
const toDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS

export const RAV67_CLASS_LABELS: Record<Rav67Class, string> = {
  clase_1: 'Clase 1',
  clase_2: 'Clase 2',
  clase_3: 'Clase 3',
}

/** Keeps, per key, the item `newer` prefers. */
function latestBy<T>(items: readonly T[], key: (item: T) => string, newer: (a: T, b: T) => boolean): T[] {
  const latest = new Map<string, T>()
  for (const item of items) {
    const k = key(item)
    const current = latest.get(k)
    if (!current || newer(item, current)) latest.set(k, item)
  }
  return [...latest.values()]
}

const byIssue = (a: { issueDate: string; createdAt: Date }, b: { issueDate: string; createdAt: Date }) =>
  a.issueDate > b.issueDate || (a.issueDate === b.issueDate && a.createdAt > b.createdAt)
const byExpiry = (a: { expiryDate: string; createdAt: Date }, b: { expiryDate: string; createdAt: Date }) =>
  a.expiryDate > b.expiryDate || (a.expiryDate === b.expiryDate && a.createdAt > b.createdAt)

interface CredentialItem {
  kind: CredentialKind
  id: string
  person: PersonRecord
  description: string
  /** The license itself, or the license a rating belongs to; null for a medical certificate. */
  license: LicenseRecord | null
  number: string | null
  expiryDate: string | null
}

interface CurrentCredentials {
  licenses: LicenseRecord[]
  medical: MedicalRecord[]
  items: CredentialItem[]
}

/**
 * The credentials in force: a renewal supersedes the previous record, so only the latest license
 * per person and type, the latest rating per license and rating, and the latest medical
 * certificate per person count.
 */
function currentCredentials(data: ReportDataset): CurrentCredentials {
  const people = new Map(data.people.map((p) => [p.id, p]))
  const licenses = latestBy(data.licenses, (l) => `${l.personalId}:${l.licenseTypeId}`, byIssue).filter((l) =>
    people.has(l.personalId),
  )
  const licenseById = new Map(licenses.map((l) => [l.id, l]))
  const typeRatings = latestBy(
    data.typeRatings.filter((r) => licenseById.has(r.licenciaId)),
    (r) => `${r.licenciaId}:${r.typeRatingId}`,
    byExpiry,
  )
  const classRatings = latestBy(
    data.classRatings.filter((r) => licenseById.has(r.licenciaId)),
    (r) => `${r.licenciaId}:${r.classRatingId}`,
    byExpiry,
  )
  const medical = latestBy(data.medical, (m) => m.personalId, byIssue).filter((m) => people.has(m.personalId))

  const items: CredentialItem[] = [
    ...licenses.map((l) => ({
      kind: 'licencia' as const,
      id: l.id,
      person: people.get(l.personalId)!,
      description: l.licenseTypeName,
      license: l,
      number: l.number,
      expiryDate: l.expiryDate,
    })),
    ...typeRatings.map((r) => {
      const license = licenseById.get(r.licenciaId)!
      return {
        kind: 'habilitacion_tipo' as const,
        id: r.id,
        person: people.get(license.personalId)!,
        description: `${r.typeRatingName} · ${r.functionName}`,
        license,
        number: license.number,
        expiryDate: r.expiryDate,
      }
    }),
    ...classRatings.map((r) => {
      const license = licenseById.get(r.licenciaId)!
      return {
        kind: 'habilitacion_clase' as const,
        id: r.id,
        person: people.get(license.personalId)!,
        description: r.classRatingName,
        license,
        number: license.number,
        expiryDate: r.expiryDate,
      }
    }),
    ...medical.map((m) => ({
      kind: 'certificado_medico' as const,
      id: m.id,
      person: people.get(m.personalId)!,
      description: RAV67_CLASS_LABELS[m.rav67Class],
      license: null,
      number: m.number,
      expiryDate: m.expiryDate,
    })),
  ]
  return { licenses, medical, items }
}

const fullName = (p: PersonRecord) => `${p.firstNames} ${p.lastNames}`
const compareNames = (a: PersonRecord, b: PersonRecord) =>
  a.lastNames.localeCompare(b.lastNames, 'es') || a.firstNames.localeCompare(b.firstNames, 'es')
const inRange = (date: string | null, { from, to }: ReportFilters) =>
  (!from && !to) || (date !== null && (!from || date >= from) && (!to || date <= to))
const matchesLicense = (license: LicenseRecord | null, { licenseTypeId, rav60Category }: ReportFilters) =>
  (!licenseTypeId && !rav60Category) ||
  (license !== null &&
    (!licenseTypeId || licenseTypeId.includes(license.licenseTypeId)) &&
    (!rav60Category || rav60Category.includes(license.rav60Category)))

const statusOf = (ctx: StatusContext, expiryDate: string | null, personalId: string) =>
  deriveCredentialStatus(expiryDate, ctx.today, ctx.thresholdDays, ctx.blockedPersonIds.has(personalId))
const dateStatusOf = (ctx: StatusContext, expiryDate: string | null) =>
  deriveCredentialStatus(expiryDate, ctx.today, ctx.thresholdDays, false)

/**
 * Report 1 (D10): current credentials that are expired or near expiry by date, soonest first. The
 * status is the derived one, so a credential of a blocked holder shows as `bloqueada`.
 */
export function buildExpiryReport(data: ReportDataset, ctx: StatusContext, filters: ReportFilters): ExpiryReportRow[] {
  const rows: Array<{ row: ExpiryReportRow; person: PersonRecord }> = []
  for (const c of currentCredentials(data).items) {
    const byDate = dateStatusOf(ctx, c.expiryDate)
    if (c.expiryDate === null || (byDate !== 'vencida' && byDate !== 'proxima_a_vencer')) continue
    const status = statusOf(ctx, c.expiryDate, c.person.id)
    if (!matchesLicense(c.license, filters) || (filters.status && !filters.status.includes(status))) continue
    if (!inRange(c.expiryDate, filters)) continue
    rows.push({
      person: c.person,
      row: {
        personalId: c.person.id,
        cedula: c.person.cedula,
        fullName: fullName(c.person),
        credentialKind: c.kind,
        credentialId: c.id,
        description: c.description,
        licenseTypeName: c.license?.licenseTypeName ?? null,
        rav60Category: c.license?.rav60Category ?? null,
        number: c.number,
        expiryDate: c.expiryDate,
        daysRemaining: toDay(c.expiryDate) - toDay(ctx.today),
        status,
      },
    })
  }
  return rows
    .sort((a, b) => a.row.expiryDate.localeCompare(b.row.expiryDate) || compareNames(a.person, b.person))
    .map(({ row }) => row)
}

/** Report 2 (D10, REP-06): every person with their current credentials and their worst status. */
export function buildConsolidatedReport(
  data: ReportDataset,
  ctx: StatusContext,
  filters: ReportFilters,
): ConsolidatedReportRow[] {
  const current = currentCredentials(data)
  const blocksByPerson = new Map<string, number>()
  for (const b of data.activeBlocks) blocksByPerson.set(b.personalId, (blocksByPerson.get(b.personalId) ?? 0) + 1)

  return [...data.people]
    .sort(compareNames)
    .map((person) => {
      const licenses = current.licenses.filter((l) => l.personalId === person.id)
      const items = current.items.filter((c) => c.person.id === person.id)
      const ratings = items.filter((c) => c.kind === 'habilitacion_tipo' || c.kind === 'habilitacion_clase')
      const cert = current.medical.find((m) => m.personalId === person.id) ?? null
      const blocked = ctx.blockedPersonIds.has(person.id)
      const statuses: DerivedCredentialStatus[] = items.map((c) => statusOf(ctx, c.expiryDate, person.id))
      const expiries = items.flatMap((c) => (c.expiryDate === null ? [] : [c.expiryDate])).sort()
      const row: ConsolidatedReportRow = {
        personalId: person.id,
        cedula: person.cedula,
        fullName: fullName(person),
        licenses: licenses.map((l) => ({
          licenseTypeName: l.licenseTypeName,
          rav60Category: l.rav60Category,
          number: l.number,
          expiryDate: l.expiryDate,
          status: statusOf(ctx, l.expiryDate, person.id),
        })),
        ratings: {
          total: ratings.length,
          expired: ratings.filter((r) => dateStatusOf(ctx, r.expiryDate) === 'vencida').length,
          nearExpiry: ratings.filter((r) => dateStatusOf(ctx, r.expiryDate) === 'proxima_a_vencer').length,
        },
        medical: cert && {
          rav67Class: cert.rav67Class,
          number: cert.number,
          expiryDate: cert.expiryDate,
          status: statusOf(ctx, cert.expiryDate, person.id),
        },
        activeBlocks: blocksByPerson.get(person.id) ?? 0,
        nextExpiryDate: expiries[0] ?? null,
        status: blocked ? 'bloqueada' : (worstCredentialStatus(statuses) ?? NO_CREDENTIALS_STATUS),
      }
      return { row, licenses }
    })
    .filter(
      ({ row, licenses }) =>
        ((!filters.licenseTypeId && !filters.rav60Category) || licenses.some((l) => matchesLicense(l, filters))) &&
        (!filters.status || filters.status.includes(row.status)) &&
        inRange(row.nextExpiryDate, filters),
    )
    .map(({ row }) => row)
}

/** Report 3 (D10): unresolved blocks, newest first. The range applies to the day each was registered. */
export function buildActiveBlocksReport(data: ReportDataset, filters: ReportFilters): ActiveBlockReportRow[] {
  const people = new Map(data.people.map((p) => [p.id, p]))
  const current = currentCredentials(data)
  return data.activeBlocks
    .filter((b) => people.has(b.personalId))
    .filter(
      (b) =>
        ((!filters.licenseTypeId && !filters.rav60Category) ||
          current.licenses.some((l) => l.personalId === b.personalId && matchesLicense(l, filters))) &&
        inRange(b.createdAt.toISOString().slice(0, 10), filters),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((b) => {
      const person = people.get(b.personalId)!
      return {
        blockId: b.id,
        personalId: person.id,
        cedula: person.cedula,
        fullName: fullName(person),
        type: b.type,
        reason: b.reason,
        createdAt: b.createdAt.toISOString(),
        createdByName: b.createdByName,
      }
    })
}
