import { catalogAttachmentType, type DbExecutor, personalAdjunto } from '@sryg/db'
import { and, desc, eq } from 'drizzle-orm'
import type { StoredFile } from '../dtos/personnel-file.dto'
import type { NewAttachment, PersonnelAttachment } from '../services/personnel-attachment'

const a = personalAdjunto
// Everything but the bytes, plus the catalog type's Spanish name.
const attachmentFields = {
  id: a.id,
  personalId: a.personalId,
  attachmentTypeId: a.attachmentTypeId,
  attachmentTypeName: catalogAttachmentType.nameEs,
  filename: a.filename,
  mime: a.mime,
  size: a.size,
  createdAt: a.createdAt,
}

const ofPerson = (personalId: string, id: string) => and(eq(a.personalId, personalId), eq(a.id, id))

export class AttachmentRepository {
  constructor(private readonly executor: DbExecutor) {}

  /** Newest first. */
  list(personalId: string): Promise<PersonnelAttachment[]> {
    return this.executor
      .select(attachmentFields)
      .from(a)
      .innerJoin(catalogAttachmentType, eq(catalogAttachmentType.id, a.attachmentTypeId))
      .where(eq(a.personalId, personalId))
      .orderBy(desc(a.createdAt), desc(a.id))
  }

  async find(personalId: string, id: string): Promise<PersonnelAttachment | null> {
    const [row] = await this.executor
      .select(attachmentFields)
      .from(a)
      .innerJoin(catalogAttachmentType, eq(catalogAttachmentType.id, a.attachmentTypeId))
      .where(ofPerson(personalId, id))
      .limit(1)
    return row ?? null
  }

  /** The bytes of one attachment of the person; null when it does not exist. */
  async findFile(personalId: string, id: string): Promise<StoredFile | null> {
    const [row] = await this.executor
      .select({ data: a.data, mime: a.mime })
      .from(a)
      .where(ofPerson(personalId, id))
      .limit(1)
    return row ?? null
  }

  async create({ personalId, attachmentTypeId, filename, file }: NewAttachment, actorId: string) {
    const [row] = await this.executor
      .insert(a)
      .values({
        personalId,
        attachmentTypeId,
        filename,
        mime: file.mime,
        data: file.data,
        size: file.data.length,
        createdBy: actorId,
      })
      .returning({ id: a.id })
    return (await this.find(personalId, row!.id))!
  }

  async delete(personalId: string, id: string): Promise<void> {
    await this.executor.delete(a).where(ofPerson(personalId, id))
  }
}
