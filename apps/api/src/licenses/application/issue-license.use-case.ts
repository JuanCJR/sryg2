import type { IssueLicenseData, LicenseDto } from '@sryg/types'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import type { Clock } from '../domain/clock'
import { type Actor, computeLicenseExpiry, LICENSE_ENTITY } from '../domain/license'
import type { LicensesUnitOfWork } from '../domain/licenses-unit-of-work'
import {
  applyRatingChanges,
  assertActiveCatalogItems,
  assertNotBlocked,
  medicalCoherenceProblem,
  NO_RATING_CHANGES,
} from './license-rules'
import { statusContext, withStatus } from './license-status'

/**
 * Issues a license (LIC-03, D20, D22) with the ratings of the same trámite, in one transaction
 * with its audit rows (BR-11, NFR-09). Refused with 409 while the person has an active block
 * (BR-07) or lacks the medical certificate the type requires (D13).
 */
export class IssueLicenseUseCase {
  constructor(
    private readonly uow: LicensesUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(actor: Actor, input: IssueLicenseData): Promise<LicenseDto> {
    const today = this.clock.today()
    return this.uow.run(async (repos) => {
      const { store, reader, audit, validity, blocks } = repos
      const person = await store.findPerson(input.personalId)
      if (!person) throw new NotFoundError('La persona no existe.')
      const type = await store.findLicenseType(input.licenseTypeId)
      if (!type?.active) throw new NotFoundError('Tipo de licencia: no existe o está inactivo en el catálogo.')

      await assertNotBlocked(repos, person.id)
      const problem = await medicalCoherenceProblem(store, type, person.id, today)
      if (problem) throw new ConflictError(problem)
      await assertActiveCatalogItems(store, 'license-observations', input.observationIds)

      const typeValidity = await validity.licenseTypeValidity(type.id)
      const expiryDate = computeLicenseExpiry(input.issueDate, typeValidity!)
      const id = await store.insertLicense({
        personalId: person.id,
        licenseTypeId: type.id,
        number: input.number ?? person.cedula,
        issueDate: input.issueDate,
        expiryDate,
      })
      await store.setObservations(id, input.observationIds)
      await audit.record({
        actorId: actor.id,
        action: 'emitir',
        entity: LICENSE_ENTITY,
        entityId: id,
        changes: { after: await reader.findById(id) },
      })
      await applyRatingChanges(
        repos,
        actor,
        { id, expiryDate },
        { ...NO_RATING_CHANGES, addTypeRatings: input.addTypeRatings, addClassRatings: input.addClassRatings },
        today,
      )
      const view = (await reader.findById(id))!
      return withStatus(view, await statusContext([person.id], today, validity, blocks))
    })
  }
}
