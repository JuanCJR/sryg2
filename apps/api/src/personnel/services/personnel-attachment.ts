import type { StoredFile } from '../dtos/personnel-file.dto'

export const ATTACHMENT_ENTITY = 'personal_adjunto'

/** A document of the person's file (D21), without its bytes. */
export interface PersonnelAttachment {
  id: string
  personalId: string
  attachmentTypeId: string
  /** Spanish name of the catalog attachment type. */
  attachmentTypeName: string
  filename: string
  mime: string
  size: number
  createdAt: Date
}

export interface NewAttachment {
  personalId: string
  attachmentTypeId: string
  filename: string
  file: StoredFile
}
