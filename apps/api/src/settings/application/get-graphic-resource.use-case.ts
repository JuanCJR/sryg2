import type { GraphicResourceKind } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import type { GraphicResourceContent, GraphicResourceRepository } from '../domain/graphic-resource'

export class GetGraphicResourceUseCase {
  constructor(private readonly resources: Pick<GraphicResourceRepository, 'findContent'>) {}

  async execute(kind: GraphicResourceKind): Promise<GraphicResourceContent> {
    const found = await this.resources.findContent(kind)
    if (!found) throw new NotFoundError('Graphic resource not configured')
    return found
  }
}
