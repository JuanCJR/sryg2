import type {
  LicenseCheckDto,
  LicenseCheckQuery,
  LicenseDto,
  LicenseHistoryEntryDto,
  LicenseListItemDto,
  LicenseListQuery,
  Paginated,
} from '@sryg/types'
import type { ActiveBlockQuery } from '../../shared/credentials/domain/active-block-query'
import type { ValidityParametersReader } from '../../shared/credentials/domain/validity-parameters-reader'
import { NotFoundError } from '../../shared/domain/errors'
import type { Clock } from '../domain/clock'
import { BLOCKED_MESSAGE, computeLicenseExpiry } from '../domain/license'
import type { LicenseReader } from '../domain/license-reader'
import type { LicenseStore } from '../domain/license-store'
import { medicalCoherenceProblem } from './license-rules'
import { listItemWithStatus, statusContext, withStatus } from './license-status'

/** Read side: detail, the person's licenses, the SLYM-like query, the pre-check (LIC-05) and the history (LIC-06). */
export class LicenseQueriesUseCase {
  constructor(
    private readonly reader: LicenseReader,
    private readonly store: LicenseStore,
    private readonly validity: ValidityParametersReader,
    private readonly blocks: ActiveBlockQuery,
    private readonly clock: Clock,
  ) {}

  async get(id: string): Promise<LicenseDto> {
    const view = await this.reader.findById(id)
    if (!view) throw new NotFoundError('La licencia no existe.')
    return withStatus(view, await this.context([view.personalId]))
  }

  async byPerson(personalId: string): Promise<LicenseDto[]> {
    if (!(await this.store.findPerson(personalId))) throw new NotFoundError('La persona no existe.')
    const views = await this.reader.findByPerson(personalId)
    const ctx = await this.context([personalId])
    return views.map((view) => withStatus(view, ctx))
  }

  async list(query: LicenseListQuery): Promise<Paginated<LicenseListItemDto>> {
    const page = await this.reader.list(query)
    const ctx = await this.context(page.items.map((i) => i.personalId))
    return { ...page, items: page.items.map((item) => listItemWithStatus(item, ctx)) }
  }

  async history(licenseId: string): Promise<LicenseHistoryEntryDto[]> {
    if (!(await this.store.findLicense(licenseId))) throw new NotFoundError('La licencia no existe.')
    return this.reader.history(licenseId)
  }

  /**
   * What would stop a trámite and what it would issue, before the operator confirms: the active
   * block (BR-07), the D13 coherence of the chosen type (or of the license to renew) and the
   * projected expiry with its `PENDIENTE INAC` flag (D3).
   */
  async check({ personalId, licenseTypeId, licenseId, issueDate }: LicenseCheckQuery): Promise<LicenseCheckDto> {
    const today = this.clock.today()
    if (!(await this.store.findPerson(personalId))) throw new NotFoundError('La persona no existe.')
    const blocked = await this.blocks.hasActiveBlock(personalId)
    const problems = blocked ? [BLOCKED_MESSAGE] : []

    let typeId = licenseTypeId
    if (licenseId) {
      const license = await this.store.findLicense(licenseId)
      if (!license || license.personalId !== personalId) throw new NotFoundError('La licencia no existe.')
      typeId = license.licenseTypeId
    }
    if (!typeId) return { blocked, problems, projection: null }
    const type = await this.store.findLicenseType(typeId)
    if (!type) throw new NotFoundError('Tipo de licencia: no existe o está inactivo en el catálogo.')
    const problem = await medicalCoherenceProblem(this.store, type, personalId, today)
    if (problem) problems.push(problem)
    if (!issueDate) return { blocked, problems, projection: null }

    const validity = (await this.validity.licenseTypeValidity(typeId))!
    let expiryDate: string | null
    try {
      expiryDate = computeLicenseExpiry(issueDate, validity)
    } catch (error) {
      problems.push((error as Error).message)
      return { blocked, problems, projection: null }
    }
    return {
      blocked,
      problems,
      projection: { expiryDate, appliesExpiry: validity.appliesExpiry, validityIsPlaceholder: validity.isPlaceholder },
    }
  }

  private context(personalIds: readonly string[]) {
    return statusContext(personalIds, this.clock.today(), this.validity, this.blocks)
  }
}
