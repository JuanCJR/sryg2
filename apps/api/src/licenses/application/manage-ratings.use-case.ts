import type { ClassRatingDto, NewClassRatingInput, NewTypeRatingInput, TypeRatingDto } from '@sryg/types'
import { NotFoundError } from '../../shared/domain/errors'
import type { Clock } from '../domain/clock'
import type { Actor } from '../domain/license'
import type { LicensesUnitOfWork, LicensesUowRepos } from '../domain/licenses-unit-of-work'
import { applyRatingChanges, assertNotBlocked, NO_RATING_CHANGES, type RatingChanges } from './license-rules'
import { statusContext, withStatus } from './license-status'

/**
 * Adds, renews and removes the type and class ratings of a license outside a full trámite (D20),
 * each in its own transaction with its audit row. Issuing or renewing one needs no active block
 * (BR-07) and the license valid today (D13); removing one is not an issuance and is always allowed.
 */
export class ManageRatingsUseCase {
  constructor(
    private readonly uow: LicensesUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async addTypeRating(actor: Actor, licenseId: string, input: NewTypeRatingInput): Promise<TypeRatingDto> {
    const { license, added } = await this.apply(actor, licenseId, { addTypeRatings: [input] }, true)
    return license.typeRatings.find((r) => r.id === added[0])!
  }

  async renewTypeRating(actor: Actor, licenseId: string, ratingId: string, expiryDate: string): Promise<TypeRatingDto> {
    const { license } = await this.apply(actor, licenseId, { renewTypeRatings: [{ id: ratingId, expiryDate }] }, true)
    return license.typeRatings.find((r) => r.id === ratingId)!
  }

  async removeTypeRating(actor: Actor, licenseId: string, ratingId: string): Promise<void> {
    await this.apply(actor, licenseId, { removeTypeRatingIds: [ratingId] }, false)
  }

  async addClassRating(actor: Actor, licenseId: string, input: NewClassRatingInput): Promise<ClassRatingDto> {
    const { license, added } = await this.apply(actor, licenseId, { addClassRatings: [input] }, true)
    return license.classRatings.find((r) => r.id === added[0])!
  }

  async renewClassRating(
    actor: Actor,
    licenseId: string,
    ratingId: string,
    expiryDate: string,
  ): Promise<ClassRatingDto> {
    const { license } = await this.apply(actor, licenseId, { renewClassRatings: [{ id: ratingId, expiryDate }] }, true)
    return license.classRatings.find((r) => r.id === ratingId)!
  }

  async removeClassRating(actor: Actor, licenseId: string, ratingId: string): Promise<void> {
    await this.apply(actor, licenseId, { removeClassRatingIds: [ratingId] }, false)
  }

  private apply(actor: Actor, licenseId: string, changes: Partial<RatingChanges>, issues: boolean) {
    const today = this.clock.today()
    return this.uow.run(async (repos: LicensesUowRepos) => {
      const license = await repos.store.findLicense(licenseId)
      if (!license) throw new NotFoundError('La licencia no existe.')
      if (issues) await assertNotBlocked(repos, license.personalId)
      const added = await applyRatingChanges(repos, actor, license, { ...NO_RATING_CHANGES, ...changes }, today)
      const view = (await repos.reader.findById(licenseId))!
      const ctx = await statusContext([license.personalId], today, repos.validity, repos.blocks)
      return { license: withStatus(view, ctx), added }
    })
  }
}
