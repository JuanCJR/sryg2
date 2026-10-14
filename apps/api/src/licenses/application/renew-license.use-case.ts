import type { RenewLicenseData, LicenseDto } from '@sryg/types'
import { ConflictError, NotFoundError } from '../../shared/domain/errors'
import type { Clock } from '../domain/clock'
import { type Actor, computeLicenseExpiry, LICENSE_ENTITY } from '../domain/license'
import type { LicensesUnitOfWork } from '../domain/licenses-unit-of-work'
import {
  applyRatingChanges,
  assertActiveCatalogItems,
  assertNotBlocked,
  medicalCoherenceProblem,
} from './license-rules'
import { statusContext, withStatus } from './license-status'

/**
 * Renews a license in place (LIC-03): new issue date, expiry recomputed from its type (D20),
 * the full observation list and the rating changes of the trámite, audited as `renovar` with the
 * before and after snapshots. The same 409 rules as issuing apply (BR-07, D13).
 */
export class RenewLicenseUseCase {
  constructor(
    private readonly uow: LicensesUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(actor: Actor, licenseId: string, input: RenewLicenseData): Promise<LicenseDto> {
    const today = this.clock.today()
    return this.uow.run(async (repos) => {
      const { store, reader, audit, validity, blocks } = repos
      const current = await store.findLicense(licenseId)
      if (!current) throw new NotFoundError('La licencia no existe.')
      const type = (await store.findLicenseType(current.licenseTypeId))!

      await assertNotBlocked(repos, current.personalId)
      const problem = await medicalCoherenceProblem(store, type, current.personalId, today)
      if (problem) throw new ConflictError(problem)
      // Observations already on the license may stay even if deactivated since; new ones must be active.
      await assertActiveCatalogItems(
        store,
        'license-observations',
        input.observationIds.filter((id) => !current.observationIds.includes(id)),
      )

      const before = await reader.findById(licenseId)
      const expiryDate = computeLicenseExpiry(input.issueDate, (await validity.licenseTypeValidity(type.id))!)
      await store.updateLicense(licenseId, {
        number: input.number ?? current.number,
        issueDate: input.issueDate,
        expiryDate,
      })
      await store.setObservations(licenseId, input.observationIds)
      await audit.record({
        actorId: actor.id,
        action: 'renovar',
        entity: LICENSE_ENTITY,
        entityId: licenseId,
        changes: { before, after: await reader.findById(licenseId) },
      })
      await applyRatingChanges(repos, actor, { id: licenseId, expiryDate }, input, today)
      const view = (await reader.findById(licenseId))!
      return withStatus(view, await statusContext([current.personalId], today, validity, blocks))
    })
  }
}
