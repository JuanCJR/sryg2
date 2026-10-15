import type { GraphicResourceDto, GraphicResourceKind } from '@sryg/types'
import type { SettingsTransaction } from '../settings.types'
import { GRAPHIC_RESOURCE_ENTITY, validateGraphicImage } from './graphic-resource'
import { toGraphicResourceDto } from './list-graphic-resources.service'
import type { Actor } from './system-parameter'

/** Creates or replaces a credential image (D18) and audits it, without the bytes, in the same transaction. */
export class SaveGraphicResourceService {
  constructor(private readonly transaction: SettingsTransaction) {}

  async execute(
    actor: Actor,
    kind: GraphicResourceKind,
    declaredMime: string | undefined,
    data: Buffer | null,
  ): Promise<GraphicResourceDto> {
    const content = validateGraphicImage(declaredMime, data)
    return this.transaction.run(async ({ graphicResources, audit }) => {
      const previous = await graphicResources.findMetadata(kind)
      const saved = await graphicResources.save(kind, content, actor.id)
      const summary = (m: { mime: string; size: number }) => ({ kind, mime: m.mime, size: m.size })
      await audit.record({
        actorId: actor.id,
        action: previous ? 'actualizar' : 'crear',
        entity: GRAPHIC_RESOURCE_ENTITY,
        entityId: null,
        changes: previous ? { before: summary(previous), after: summary(saved) } : { after: summary(saved) },
      })
      return toGraphicResourceDto(kind, saved)
    })
  }
}
