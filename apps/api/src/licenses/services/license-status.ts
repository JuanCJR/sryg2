import { deriveCredentialStatus, type LicenseDto, type LicenseListItemDto } from '@sryg/types'
import type { ActiveBlocksRepository } from '../../common/credentials/repositories/active-blocks.repository'
import type { ValidityParametersRepository } from '../../common/credentials/repositories/validity-parameters.repository'
import type { LicenseListItemView, LicenseView } from '../dtos/license-view.dto'

/** What a derived status depends on (D17, BR-12): the day, the configurable threshold and the blocks. */
export interface StatusContext {
  today: string
  thresholdDays: number
  blockedPersonIds: Set<string>
}

export async function statusContext(
  personalIds: readonly string[],
  today: string,
  validity: ValidityParametersRepository,
  blocks: ActiveBlocksRepository,
): Promise<StatusContext> {
  const [threshold, blockedPersonIds] = await Promise.all([
    validity.alertThresholdDays(),
    blocks.withActiveBlock([...new Set(personalIds)]),
  ])
  return { today, thresholdDays: threshold.value, blockedPersonIds }
}

/** A rating shares its holder's block: an active block wins over any date. */
export function withStatus(view: LicenseView, ctx: StatusContext): LicenseDto {
  const blocked = ctx.blockedPersonIds.has(view.personalId)
  const status = (expiry: string | null) => deriveCredentialStatus(expiry, ctx.today, ctx.thresholdDays, blocked)
  return {
    ...view,
    status: status(view.expiryDate),
    typeRatings: view.typeRatings.map((r) => ({ ...r, status: status(r.expiryDate) })),
    classRatings: view.classRatings.map((r) => ({ ...r, status: status(r.expiryDate) })),
  }
}

export function listItemWithStatus(item: LicenseListItemView, ctx: StatusContext): LicenseListItemDto {
  const blocked = ctx.blockedPersonIds.has(item.personalId)
  return { ...item, status: deriveCredentialStatus(item.expiryDate, ctx.today, ctx.thresholdDays, blocked) }
}
