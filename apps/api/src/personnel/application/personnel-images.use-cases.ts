import { checkPersonnelImageFile, type PersonnelImageKind } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import { InvalidPersonnelFileError } from '../domain/errors'
import { type Actor, PERSONNEL_ENTITY, type Personnel } from '../domain/personnel'
import type { ImageCompressor, IncomingFile, StoredFile } from '../domain/personnel-file'
import type { PersonnelRepository } from '../domain/personnel-repository'
import type { PersonnelUnitOfWork } from '../domain/personnel-unit-of-work'

const FLAG = { photo: 'hasPhoto', signature: 'hasSignature' } as const

/** PER-03 / D5: replaces the photo or the signature, compressed by the server to 200 KB at most. */
export class SetPersonnelImageUseCase {
  constructor(
    private readonly uow: PersonnelUnitOfWork,
    private readonly compressor: ImageCompressor,
  ) {}

  async execute(actor: Actor, id: string, kind: PersonnelImageKind, file: IncomingFile | undefined) {
    if (!file) throw new InvalidPersonnelFileError('missing')
    const problem = checkPersonnelImageFile({ mime: file.mimetype, size: file.size })
    if (problem) throw new InvalidPersonnelFileError(problem)
    // Compressing is slow: do it before opening the transaction.
    const image = await this.compressor.compress(file.buffer, kind)

    return this.uow.run(async ({ personnel, audit }): Promise<Personnel> => {
      const current = await personnel.findById(id)
      if (!current) throw new NotFoundError('Personnel not found')
      const updated = await personnel.setImage(id, kind, image, actor.id)
      // The bytes never go to the audit trail: only that the image changed, its type and size.
      await audit.record({
        actorId: actor.id,
        action: 'actualizar',
        entity: PERSONNEL_ENTITY,
        entityId: id,
        changes: {
          before: { [FLAG[kind]]: current[FLAG[kind]] },
          after: { [FLAG[kind]]: true, [`${kind}Mime`]: image.mime, [`${kind}Size`]: image.data.length },
        },
      })
      return updated
    })
  }
}

export class GetPersonnelImageUseCase {
  constructor(private readonly personnel: PersonnelRepository) {}

  async execute(id: string, kind: PersonnelImageKind): Promise<StoredFile> {
    const image = await this.personnel.getImage(id, kind)
    if (!image) throw new NotFoundError(kind === 'photo' ? 'Photo not found' : 'Signature not found')
    return image
  }
}
