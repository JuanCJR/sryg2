import {
  alerta,
  auditoria,
  bloqueo,
  certificadoMedico,
  type DbExecutor,
  habilitacionClase,
  habilitacionTipo,
  licencia,
  personalAdjunto,
  usuario,
} from '@sryg/db'
import type { AuditFilter, Paginated } from '@sryg/types'
import { and, count, desc, eq, gte, ilike, inArray, lt, or, type SQL, sql } from 'drizzle-orm'
import type { AuditPage, AuditTrailEntry, AuditTrailReader } from '../domain/audit-trail'

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

const DAY_MS = 24 * 60 * 60 * 1000
const startOfUtcDay = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`)

/** Ids of the entities that hang from a person: whatever the trail may name for their history. */
function personEntityIds(personId: string): SQL {
  return sql`(
    select ${personalAdjunto.id} from ${personalAdjunto} where ${personalAdjunto.personalId} = ${personId}
    union all select ${licencia.id} from ${licencia} where ${licencia.personalId} = ${personId}
    union all select ${habilitacionTipo.id} from ${habilitacionTipo}
      join ${licencia} on ${licencia.id} = ${habilitacionTipo.licenciaId} where ${licencia.personalId} = ${personId}
    union all select ${habilitacionClase.id} from ${habilitacionClase}
      join ${licencia} on ${licencia.id} = ${habilitacionClase.licenciaId} where ${licencia.personalId} = ${personId}
    union all select ${certificadoMedico.id} from ${certificadoMedico} where ${certificadoMedico.personalId} = ${personId}
    union all select ${bloqueo.id} from ${bloqueo} where ${bloqueo.personalId} = ${personId}
    union all select ${alerta.id} from ${alerta} where ${alerta.personalId} = ${personId}
  )`
}

function where({ actor, action, entity, entityId, personId, from, to }: AuditFilter): SQL | undefined {
  const actorLike = actor ? `%${escapeLike(actor)}%` : ''
  return and(
    actor ? or(ilike(usuario.fullName, actorLike), ilike(usuario.email, actorLike)) : undefined,
    action ? inArray(auditoria.action, action) : undefined,
    entity ? inArray(auditoria.entity, entity) : undefined,
    entityId ? eq(auditoria.entityId, entityId) : undefined,
    personId
      ? or(eq(auditoria.entityId, personId), sql`${auditoria.entityId} in ${personEntityIds(personId)}`)
      : undefined,
    from ? gte(auditoria.occurredAt, startOfUtcDay(from)) : undefined,
    to ? lt(auditoria.occurredAt, new Date(startOfUtcDay(to).getTime() + DAY_MS)) : undefined,
  )
}

const entryFields = {
  id: auditoria.id,
  occurredAt: auditoria.occurredAt,
  actorId: usuario.id,
  actorName: usuario.fullName,
  actorEmail: usuario.email,
  action: auditoria.action,
  entity: auditoria.entity,
  entityId: auditoria.entityId,
  changes: auditoria.changes,
}

type EntryRow = Omit<AuditTrailEntry, 'actor'> & {
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
}

function toEntry({ actorId, actorName, actorEmail, ...row }: EntryRow): AuditTrailEntry {
  const actor = actorId === null ? null : { id: actorId, fullName: actorName ?? '', email: actorEmail ?? '' }
  return { ...row, actor }
}

export class DrizzleAuditTrailReader implements AuditTrailReader {
  constructor(private readonly executor: DbExecutor) {}

  async list(filter: AuditFilter, { page, pageSize }: AuditPage): Promise<Paginated<AuditTrailEntry>> {
    const condition = where(filter)
    const [rows, [totals]] = await Promise.all([
      this.select(condition)
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      this.executor
        .select({ total: count() })
        .from(auditoria)
        .leftJoin(usuario, eq(usuario.id, auditoria.actorId))
        .where(condition),
    ])
    return { items: rows.map(toEntry), page, pageSize, total: totals?.total ?? 0 }
  }

  async all(filter: AuditFilter): Promise<AuditTrailEntry[]> {
    return (await this.select(where(filter))).map(toEntry)
  }

  private select(condition: SQL | undefined) {
    return this.executor
      .select(entryFields)
      .from(auditoria)
      .leftJoin(usuario, eq(usuario.id, auditoria.actorId))
      .where(condition)
      .orderBy(desc(auditoria.occurredAt), desc(auditoria.id))
  }
}
