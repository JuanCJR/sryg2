import { normalizeCedula, type UpdatePersonnelInput } from '@sryg/types'
import { NotFoundError } from '../../common/errors/domain-errors'
import type { PersonnelTransaction } from '../personnel.types'
import { checkCatalogReferences } from './check-catalog-references'
import { type Actor, PERSONNEL_ENTITY, type Personnel, type PersonnelChanges } from './personnel'

export class UpdatePersonnelService {
  constructor(private readonly transaction: PersonnelTransaction) {}

  async execute(actor: Actor, id: string, input: UpdatePersonnelInput): Promise<Personnel> {
    return this.transaction.run(async ({ personnel, audit, catalogs }) => {
      const current = await personnel.findById(id)
      if (!current) throw new NotFoundError('Personnel not found')
      await checkCatalogReferences(catalogs, input, current)

      const requested: PersonnelChanges = { ...input }
      if (input.cedula !== undefined) requested.cedula = normalizeCedula(input.cedula)
      const before: Record<string, unknown> = {}
      const after: Record<string, unknown> = {}
      const changes: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(requested)) {
        const previous = current[key as keyof Personnel]
        if (value === undefined || value === previous) continue
        before[key] = previous
        after[key] = value
        changes[key] = value
      }
      // Nothing actually changed: no write and no audit row for a change that did not occur.
      if (Object.keys(changes).length === 0) return current

      const updated = await personnel.update(id, changes as PersonnelChanges, actor.id)
      await audit.record({
        actorId: actor.id,
        action: 'actualizar',
        entity: PERSONNEL_ENTITY,
        entityId: id,
        changes: { before, after },
      })
      return updated
    })
  }
}
