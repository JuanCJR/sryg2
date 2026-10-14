import type { StoredFile } from './personnel-file'

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

export interface AttachmentRepository {
  /** Newest first. */
  list(personalId: string): Promise<PersonnelAttachment[]>
  find(personalId: string, id: string): Promise<PersonnelAttachment | null>
  /** The bytes of one attachment of the person; null when it does not exist. */
  findFile(personalId: string, id: string): Promise<StoredFile | null>
  create(data: NewAttachment, actorId: string): Promise<PersonnelAttachment>
  delete(personalId: string, id: string): Promise<void>
}
