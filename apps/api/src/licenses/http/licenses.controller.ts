import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common'
import {
  type IssueLicenseData,
  issueLicenseSchema,
  type LicenseCheckQuery,
  licenseCheckQuerySchema,
  type LicenseListQuery,
  licenseListQuerySchema,
  type NewClassRatingInput,
  newClassRatingSchema,
  type NewTypeRatingInput,
  newTypeRatingSchema,
  type RenewLicenseData,
  renewLicenseSchema,
  type RenewRatingInput,
  renewRatingSchema,
} from '@sryg/types'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../auth/http/jwt-auth.guard'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { IssueLicenseUseCase } from '../application/issue-license.use-case'
import { LicenseQueriesUseCase } from '../application/license-queries.use-case'
import { ManageRatingsUseCase } from '../application/manage-ratings.use-case'
import { RenewLicenseUseCase } from '../application/renew-license.use-case'

const idPipe = new ZodValidationPipe(z.uuid())

/**
 * Every role reads; the Admin and the Supervisor de Licencias write (D1, D24). The history is the
 * audit trail of the license, so it follows the audit viewer's access (Consulta has none).
 */
@Controller('licenses')
export class LicensesController {
  constructor(
    private readonly issueLicense: IssueLicenseUseCase,
    private readonly renewLicense: RenewLicenseUseCase,
    private readonly ratings: ManageRatingsUseCase,
    private readonly queries: LicenseQueriesUseCase,
  ) {}

  @Get()
  @RequirePermission('licenses', 'read')
  list(@Query(new ZodValidationPipe(licenseListQuerySchema)) query: LicenseListQuery) {
    return this.queries.list(query)
  }

  // Declared before ':id' so "check" is never taken for an id.
  @Get('check')
  @RequirePermission('licenses', 'read')
  check(@Query(new ZodValidationPipe(licenseCheckQuerySchema)) query: LicenseCheckQuery) {
    return this.queries.check(query)
  }

  @Get(':id')
  @RequirePermission('licenses', 'read')
  get(@Param('id', idPipe) id: string) {
    return this.queries.get(id)
  }

  @Get(':id/history')
  @RequirePermission('audit', 'read')
  history(@Param('id', idPipe) id: string) {
    return this.queries.history(id)
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('licenses', 'write')
  issue(@Req() request: AuthenticatedRequest, @Body(new ZodValidationPipe(issueLicenseSchema)) body: IssueLicenseData) {
    return this.issueLicense.execute(request.user, body)
  }

  @Post(':id/renew')
  @HttpCode(200)
  @RequirePermission('licenses', 'write')
  renew(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(renewLicenseSchema)) body: RenewLicenseData,
  ) {
    return this.renewLicense.execute(request.user, id, body)
  }

  @Post(':id/type-ratings')
  @HttpCode(201)
  @RequirePermission('licenses', 'write')
  addTypeRating(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(newTypeRatingSchema)) body: NewTypeRatingInput,
  ) {
    return this.ratings.addTypeRating(request.user, id, body)
  }

  @Post(':id/type-ratings/:ratingId/renew')
  @HttpCode(200)
  @RequirePermission('licenses', 'write')
  renewTypeRating(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Param('ratingId', idPipe) ratingId: string,
    @Body(new ZodValidationPipe(renewRatingSchema)) body: RenewRatingInput,
  ) {
    return this.ratings.renewTypeRating(request.user, id, ratingId, body.expiryDate)
  }

  @Delete(':id/type-ratings/:ratingId')
  @HttpCode(204)
  @RequirePermission('licenses', 'write')
  async removeTypeRating(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Param('ratingId', idPipe) ratingId: string,
  ) {
    await this.ratings.removeTypeRating(request.user, id, ratingId)
  }

  @Post(':id/class-ratings')
  @HttpCode(201)
  @RequirePermission('licenses', 'write')
  addClassRating(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(newClassRatingSchema)) body: NewClassRatingInput,
  ) {
    return this.ratings.addClassRating(request.user, id, body)
  }

  @Post(':id/class-ratings/:ratingId/renew')
  @HttpCode(200)
  @RequirePermission('licenses', 'write')
  renewClassRating(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Param('ratingId', idPipe) ratingId: string,
    @Body(new ZodValidationPipe(renewRatingSchema)) body: RenewRatingInput,
  ) {
    return this.ratings.renewClassRating(request.user, id, ratingId, body.expiryDate)
  }

  @Delete(':id/class-ratings/:ratingId')
  @HttpCode(204)
  @RequirePermission('licenses', 'write')
  async removeClassRating(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Param('ratingId', idPipe) ratingId: string,
  ) {
    await this.ratings.removeClassRating(request.user, id, ratingId)
  }
}

/** The licenses of one person, with their ratings, for the Expediente's Licencias page key. */
@Controller('personnel/:personalId/licenses')
export class PersonLicensesController {
  constructor(private readonly queries: LicenseQueriesUseCase) {}

  @Get()
  @RequirePermission('licenses', 'read')
  list(@Param('personalId', idPipe) personalId: string) {
    return this.queries.byPerson(personalId)
  }
}
