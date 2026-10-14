import { type CreatePersonnelInput, normalizeCedula } from '@sryg/types'
import { type Actor, PERSONNEL_ENTITY, type Personnel } from '../domain/personnel'
import type { PersonnelUnitOfWork } from '../domain/personnel-unit-of-work'
import { checkCatalogReferences } from './check-catalog-references'

export class CreatePersonnelUseCase {
  constructor(private readonly uow: PersonnelUnitOfWork) {}

  async execute(actor: Actor, input: CreatePersonnelInput): Promise<Personnel> {
    return this.uow.run(async ({ personnel, audit, catalogs }) => {
      await checkCatalogReferences(catalogs, input)
      // The entity is written first: a duplicate cedula throws before any audit row exists.
      const created = await personnel.create(
        {
          cedula: normalizeCedula(input.cedula),
          firstNames: input.firstNames,
          lastNames: input.lastNames,
          documentTypeId: input.documentTypeId ?? null,
          nationalityId: input.nationalityId ?? null,
          birthDate: input.birthDate ?? null,
          address: input.address ?? null,
          email: input.email ?? null,
          phone: input.phone ?? null,
          bloodType: input.bloodType ?? null,
          cargo: input.cargo ?? null,
          dependencia: input.dependencia ?? null,
          category: input.category ?? null,
          status: input.status,
        },
        actor.id,
      )
      await audit.record({
        actorId: actor.id,
        action: 'crear',
        entity: PERSONNEL_ENTITY,
        entityId: created.id,
        changes: { after: created },
      })
      return created
    })
  }
}
