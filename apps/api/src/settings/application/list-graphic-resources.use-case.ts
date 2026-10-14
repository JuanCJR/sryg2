import { GRAPHIC_RESOURCE_KINDS, type GraphicResourceDto } from '@sryg/types'
import type { GraphicResourceMetadata, GraphicResourceRepository } from '../domain/graphic-resource'

export const toGraphicResourceDto = (
  kind: GraphicResourceDto['kind'],
  found: GraphicResourceMetadata | undefined,
): GraphicResourceDto =>
  found
    ? { kind, configured: true, mime: found.mime, size: found.size, updatedAt: found.updatedAt.toISOString() }
    : { kind, configured: false, mime: null, size: null, updatedAt: null }

/** Every resource kind of D18, configured or not, in a stable order. */
export class ListGraphicResourcesUseCase {
  constructor(private readonly resources: Pick<GraphicResourceRepository, 'listMetadata'>) {}

  async execute(): Promise<GraphicResourceDto[]> {
    const byKind = new Map((await this.resources.listMetadata()).map((row) => [row.kind, row]))
    return GRAPHIC_RESOURCE_KINDS.map((kind) => toGraphicResourceDto(kind, byKind.get(kind)))
  }
}
