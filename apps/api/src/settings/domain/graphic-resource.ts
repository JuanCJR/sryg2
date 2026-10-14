import {
  detectGraphicImageMime,
  GRAPHIC_RESOURCE_MAX_BYTES,
  GRAPHIC_RESOURCE_MIME_TYPES,
  type GraphicResourceKind,
  type GraphicResourceMime,
} from '@sryg/types'
import { DomainError } from '../../shared/domain/errors'

export const GRAPHIC_RESOURCE_ENTITY = 'recurso_grafico'

/** INAC logo or President's signature for the credential PDF (D18), without its bytes. */
export interface GraphicResourceMetadata {
  kind: GraphicResourceKind
  mime: GraphicResourceMime
  size: number
  updatedAt: Date
}

export interface GraphicResourceContent {
  mime: GraphicResourceMime
  data: Buffer
}

export interface GraphicResourceRepository {
  listMetadata(): Promise<GraphicResourceMetadata[]>
  findMetadata(kind: GraphicResourceKind): Promise<GraphicResourceMetadata | null>
  findContent(kind: GraphicResourceKind): Promise<GraphicResourceContent | null>
  /** Inserts or replaces the resource of that kind. */
  save(kind: GraphicResourceKind, content: GraphicResourceContent, actorId: string): Promise<GraphicResourceMetadata>
}

export class EmptyImageError extends DomainError {}
export class UnsupportedImageTypeError extends DomainError {}
export class ImageTooLargeError extends DomainError {}

/**
 * Accepts PNG or JPEG of up to 500 KB (D18). The declared type must match the file signature, so a
 * mislabeled file is rejected as unsupported.
 */
export function validateGraphicImage(declaredMime: string | undefined, data: Buffer | null): GraphicResourceContent {
  const mime = declaredMime?.split(';')[0]?.trim().toLowerCase()
  if (!data || !GRAPHIC_RESOURCE_MIME_TYPES.some((allowed) => allowed === mime))
    throw new UnsupportedImageTypeError('Only PNG or JPEG images are accepted')
  if (data.length === 0) throw new EmptyImageError('The image is empty')
  if (data.length > GRAPHIC_RESOURCE_MAX_BYTES)
    throw new ImageTooLargeError(`The image exceeds ${GRAPHIC_RESOURCE_MAX_BYTES / 1024} KB`)
  const detected = detectGraphicImageMime(data)
  if (detected !== mime) throw new UnsupportedImageTypeError('The file content is not the declared image type')
  return { mime: detected, data }
}
