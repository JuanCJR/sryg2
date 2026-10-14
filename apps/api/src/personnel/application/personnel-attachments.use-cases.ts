import { ATTACHMENT_MAX_BYTES, type AttachmentUploadInput } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import { InvalidPersonnelFieldError, InvalidPersonnelFileError } from '../domain/errors'
import type { Actor } from '../domain/personnel'
import { ATTACHMENT_ENTITY, type PersonnelAttachment } from '../domain/personnel-attachment'
import type { IncomingFile, StoredFile } from '../domain/personnel-file'
import type { PersonnelUnitOfWork } from '../domain/personnel-unit-of-work'
import { cleanFilename, sniffAttachmentMime } from './file-checks'

/** What the audit trail keeps of an attachment: never its bytes. */
const auditView = (attachment: PersonnelAttachment) => ({
  personalId: attachment.personalId,
  attachmentTypeId: attachment.attachmentTypeId,
  filename: attachment.filename,
  mime: attachment.mime,
  size: attachment.size,
})

/**
 * Documents of the person's file (D21): PDF or image of up to 5 MB, typed from the catalog. Reads
 * go through the unit of work too, so the person check and the read see the same snapshot.
 */
export class PersonnelAttachmentsUseCases {
  constructor(private readonly uow: PersonnelUnitOfWork) {}

  list(personalId: string): Promise<PersonnelAttachment[]> {
    return this.uow.run(async ({ personnel, attachments }) => {
      if (!(await personnel.findById(personalId))) throw new NotFoundError('Personnel not found')
      return attachments.list(personalId)
    })
  }

  async download(personalId: string, id: string): Promise<StoredFile & { filename: string }> {
    return this.uow.run(async ({ attachments }) => {
      const [meta, file] = await Promise.all([attachments.find(personalId, id), attachments.findFile(personalId, id)])
      if (!meta || !file) throw new NotFoundError('Attachment not found')
      return { ...file, filename: meta.filename }
    })
  }

  async upload(
    actor: Actor,
    personalId: string,
    input: AttachmentUploadInput,
    file: IncomingFile | undefined,
  ): Promise<PersonnelAttachment> {
    if (!file) throw new InvalidPersonnelFileError('missing')
    if (file.size === 0) throw new InvalidPersonnelFileError('empty')
    if (file.size > ATTACHMENT_MAX_BYTES) throw new InvalidPersonnelFileError('size')
    const mime = sniffAttachmentMime(file.buffer)
    if (!mime) throw new InvalidPersonnelFileError('type')

    return this.uow.run(async ({ personnel, attachments, catalogs, audit }) => {
      if (!(await personnel.findById(personalId))) throw new NotFoundError('Personnel not found')
      if (!(await catalogs.isActive('attachment-types', input.attachmentTypeId))) {
        throw new InvalidPersonnelFieldError('attachmentTypeId', 'Unknown or inactive catalog item')
      }
      const created = await attachments.create(
        {
          personalId,
          attachmentTypeId: input.attachmentTypeId,
          filename: cleanFilename(file.originalname),
          file: { data: file.buffer, mime },
        },
        actor.id,
      )
      await audit.record({
        actorId: actor.id,
        action: 'adjuntar',
        entity: ATTACHMENT_ENTITY,
        entityId: created.id,
        changes: { after: auditView(created) },
      })
      return created
    })
  }

  async remove(actor: Actor, personalId: string, id: string): Promise<void> {
    await this.uow.run(async ({ attachments, audit }) => {
      const current = await attachments.find(personalId, id)
      if (!current) throw new NotFoundError('Attachment not found')
      await attachments.delete(personalId, id)
      await audit.record({
        actorId: actor.id,
        action: 'eliminar',
        entity: ATTACHMENT_ENTITY,
        entityId: id,
        changes: { before: auditView(current) },
      })
    })
  }
}
