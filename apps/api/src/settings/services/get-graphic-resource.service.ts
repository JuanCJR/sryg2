import type { GraphicResourceKind } from '@sryg/types'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { GraphicResourceRepository } from '../repositories/graphic-resource.repository'
import type { GraphicResourceContent } from './graphic-resource'

export class GetGraphicResourceService {
  constructor(private readonly resources: Pick<GraphicResourceRepository, 'findContent'>) {}

  async execute(kind: GraphicResourceKind): Promise<GraphicResourceContent> {
    const found = await this.resources.findContent(kind)
    if (!found) throw new NotFoundError('Graphic resource not configured')
    return found
  }
}
