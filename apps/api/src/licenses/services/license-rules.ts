import type { NewClassRatingInput, NewTypeRatingInput } from '@sryg/types'
import { ConflictError, NotFoundError } from '../../common/errors/domain-errors'
import type { LicenseCatalog, LicenseTypeInfo } from '../dtos/license-record.dto'
import type { LicensesTransactionRepos } from '../licenses.types'
import type { LicenseRepository } from '../repositories/license.repository'
import {
  type Actor,
  BLOCKED_MESSAGE,
  CLASS_RATING_ENTITY,
  isValidOn,
  missingMedicalCertificateMessage,
  ratingNeedsValidLicenseMessage,
  TYPE_RATING_ENTITY,
} from './license'

const CATALOG_LABEL: Record<LicenseCatalog, string> = {
  'license-observations': 'Observación de licencia',
  'type-ratings': 'Habilitación de tipo',
  functions: 'Función',
  'class-ratings': 'Habilitación de clase',
  aircraft: 'Aeronave',
}

/** BR-07 / D9: nothing is issued or renewed while the person has an unresolved block. */
export async function assertNotBlocked({ blocks }: Pick<LicensesTransactionRepos, 'blocks'>, personalId: string) {
  if (await blocks.hasActiveBlock(personalId)) throw new ConflictError(BLOCKED_MESSAGE)
}

/** D13: the type's required RAV 67 class needs a certificate of that class valid today. Null when coherent. */
export async function medicalCoherenceProblem(
  store: LicenseRepository,
  type: LicenseTypeInfo,
  personalId: string,
  today: string,
): Promise<string | null> {
  if (!type.requiredMedicalClass) return null
  const valid = await store.hasValidMedicalCertificate(personalId, type.requiredMedicalClass, today)
  return valid ? null : missingMedicalCertificateMessage(type.nameEs, type.requiredMedicalClass)
}

/** New references must point to active catalog items (D19): inactive ones stay only where already used. */
export async function assertActiveCatalogItems(store: LicenseRepository, catalog: LicenseCatalog, ids: readonly string[]) {
  const unique = [...new Set(ids)]
  if (unique.length === 0) return
  const active = await store.activeCatalogIds(catalog, unique)
  if (unique.some((id) => !active.has(id))) {
    throw new NotFoundError(`${CATALOG_LABEL[catalog]}: un elemento no existe o está inactivo en el catálogo.`)
  }
}

/** D13: a rating is issued or renewed only on a license valid today. */
export function assertLicenseValidForRatings(expiryDate: string | null, today: string) {
  if (!isValidOn(expiryDate, today)) throw new ConflictError(ratingNeedsValidLicenseMessage(expiryDate!))
}

export interface RatingChanges {
  addTypeRatings: NewTypeRatingInput[]
  renewTypeRatings: Array<{ id: string; expiryDate: string }>
  removeTypeRatingIds: string[]
  addClassRatings: NewClassRatingInput[]
  renewClassRatings: Array<{ id: string; expiryDate: string }>
  removeClassRatingIds: string[]
}

export const NO_RATING_CHANGES: RatingChanges = {
  addTypeRatings: [],
  renewTypeRatings: [],
  removeTypeRatingIds: [],
  addClassRatings: [],
  renewClassRatings: [],
  removeClassRatingIds: [],
}

const notFound = () => new NotFoundError('La habilitación no existe en esta licencia.')

/**
 * Applies the rating part of a trámite on `licenseId`, inside the caller's transaction: removals,
 * then renewals, then additions, each with its audit row. Issuing or renewing a rating needs the
 * license valid today (D13); the block was already checked by the caller.
 */
export async function applyRatingChanges(
  { store, audit }: Pick<LicensesTransactionRepos, 'store' | 'audit'>,
  actor: Actor,
  license: { id: string; expiryDate: string | null },
  changes: RatingChanges,
  today: string,
) {
  const issuesOrRenews =
    changes.addTypeRatings.length +
      changes.renewTypeRatings.length +
      changes.addClassRatings.length +
      changes.renewClassRatings.length >
    0
  if (issuesOrRenews) assertLicenseValidForRatings(license.expiryDate, today)

  await assertActiveCatalogItems(
    store,
    'type-ratings',
    changes.addTypeRatings.map((r) => r.typeRatingId),
  )
  await assertActiveCatalogItems(
    store,
    'functions',
    changes.addTypeRatings.map((r) => r.functionId),
  )
  await assertActiveCatalogItems(
    store,
    'class-ratings',
    changes.addClassRatings.map((r) => r.classRatingId),
  )
  await assertActiveCatalogItems(
    store,
    'aircraft',
    changes.addClassRatings.flatMap((r) => r.aircraftIds),
  )

  for (const id of changes.removeTypeRatingIds) {
    const before = await store.findTypeRating(id)
    if (!before || before.licenseId !== license.id) throw notFound()
    await store.deleteTypeRating(id)
    await audit.record({
      actorId: actor.id,
      action: 'eliminar',
      entity: TYPE_RATING_ENTITY,
      entityId: id,
      changes: { before },
    })
  }
  for (const id of changes.removeClassRatingIds) {
    const before = await store.findClassRating(id)
    if (!before || before.licenseId !== license.id) throw notFound()
    await store.deleteClassRating(id)
    await audit.record({
      actorId: actor.id,
      action: 'eliminar',
      entity: CLASS_RATING_ENTITY,
      entityId: id,
      changes: { before },
    })
  }
  for (const { id, expiryDate } of changes.renewTypeRatings) {
    const before = await store.findTypeRating(id)
    if (!before || before.licenseId !== license.id) throw notFound()
    await store.updateTypeRatingExpiry(id, expiryDate)
    await audit.record({
      actorId: actor.id,
      action: 'renovar',
      entity: TYPE_RATING_ENTITY,
      entityId: id,
      changes: { before, after: { ...before, expiryDate } },
    })
  }
  for (const { id, expiryDate } of changes.renewClassRatings) {
    const before = await store.findClassRating(id)
    if (!before || before.licenseId !== license.id) throw notFound()
    await store.updateClassRatingExpiry(id, expiryDate)
    await audit.record({
      actorId: actor.id,
      action: 'renovar',
      entity: CLASS_RATING_ENTITY,
      entityId: id,
      changes: { before, after: { ...before, expiryDate } },
    })
  }
  const added: string[] = []
  for (const rating of changes.addTypeRatings) {
    const after = await store.insertTypeRating({ licenseId: license.id, ...rating })
    await audit.record({
      actorId: actor.id,
      action: 'emitir',
      entity: TYPE_RATING_ENTITY,
      entityId: after.id,
      changes: { after },
    })
    added.push(after.id)
  }
  for (const rating of changes.addClassRatings) {
    const after = await store.insertClassRating({ licenseId: license.id, ...rating })
    await audit.record({
      actorId: actor.id,
      action: 'emitir',
      entity: CLASS_RATING_ENTITY,
      entityId: after.id,
      changes: { after },
    })
    added.push(after.id)
  }
  return added
}
