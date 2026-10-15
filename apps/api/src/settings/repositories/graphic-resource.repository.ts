import { type DbExecutor, recursoGrafico } from '@sryg/db'
import type { GraphicResourceKind, GraphicResourceMime } from '@sryg/types'
import { eq, sql } from 'drizzle-orm'
import type { GraphicResourceContent, GraphicResourceMetadata } from '../services/graphic-resource'

const r = recursoGrafico
// The metadata without loading the bytes.
const metadataFields = {
  kind: r.kind,
  mime: sql<GraphicResourceMime>`${r.mime}`,
  size: sql<number>`octet_length(${r.data})::int`.as('size'),
  updatedAt: r.updatedAt,
}

export class GraphicResourceRepository {
  constructor(private readonly executor: DbExecutor) {}

  listMetadata(): Promise<GraphicResourceMetadata[]> {
    return this.executor.select(metadataFields).from(recursoGrafico)
  }

  async findMetadata(kind: GraphicResourceKind): Promise<GraphicResourceMetadata | null> {
    const [row] = await this.executor.select(metadataFields).from(recursoGrafico).where(eq(r.kind, kind)).limit(1)
    return row ?? null
  }

  async findContent(kind: GraphicResourceKind): Promise<GraphicResourceContent | null> {
    const [row] = await this.executor
      .select({ mime: sql<GraphicResourceMime>`${r.mime}`, data: r.data })
      .from(recursoGrafico)
      .where(eq(r.kind, kind))
      .limit(1)
    return row ?? null
  }

  /** Inserts or replaces the resource of that kind. */
  async save(kind: GraphicResourceKind, { mime, data }: GraphicResourceContent, actorId: string) {
    await this.executor
      .insert(recursoGrafico)
      .values({ kind, mime, data, updatedBy: actorId })
      .onConflictDoUpdate({ target: r.kind, set: { mime, data, updatedBy: actorId, updatedAt: new Date() } })
    return (await this.findMetadata(kind))!
  }
}
