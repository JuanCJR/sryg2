import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import { type Actor, PERSONNEL_ENTITY } from '../domain/personnel'
import type { PersonnelUnitOfWork } from '../domain/personnel-unit-of-work'

/** PER-07: a person who holds credentials cannot be deleted (BR-10). */
export class DeletePersonnelUseCase {
  constructor(private readonly uow: PersonnelUnitOfWork) {}

  async execute(actor: Actor, id: string): Promise<void> {
    await this.uow.run(async ({ personnel, audit }) => {
      const current = await personnel.findById(id)
      if (!current) throw new NotFoundError('Personnel not found')
      if (await personnel.hasCredentials(id)) {
        throw new ConflictError('The person holds licenses or medical certificates and cannot be deleted')
      }
      await personnel.delete(id)
      await audit.record({
        actorId: actor.id,
        action: 'eliminar',
        entity: PERSONNEL_ENTITY,
        entityId: id,
        changes: { before: current },
      })
    })
  }
}
