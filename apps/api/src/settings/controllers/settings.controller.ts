import { Body, Controller, Get, Headers, Param, Put, Req, Res, StreamableFile, UseFilters } from '@nestjs/common'
import {
  ALERT_THRESHOLD_KEY,
  type AlertThresholdInput,
  alertThresholdInputSchema,
  type GraphicResourceKind,
  graphicResourceKindSchema,
  MEDICAL_VALIDITY_KEYS,
  type MedicalValidityInput,
  medicalValidityInputSchema,
} from '@sryg/types'
import type { Response } from 'express'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { GetGraphicResourceService } from '../services/get-graphic-resource.service'
import { GetParametersService } from '../services/get-parameters.service'
import { ListGraphicResourcesService } from '../services/list-graphic-resources.service'
import { SaveGraphicResourceService } from '../services/save-graphic-resource.service'
import { SaveParametersService } from '../services/save-parameters.service'
import { GraphicResourceExceptionFilter } from './graphic-resource-exception.filter'

const kindPipe = new ZodValidationPipe(graphicResourceKindSchema)

/** Page 12 `/parametros` (D3, D15, D18): Admin only, reads included. */
@Controller('settings')
@UseFilters(GraphicResourceExceptionFilter)
export class SettingsController {
  constructor(
    private readonly getParameters: GetParametersService,
    private readonly saveParameters: SaveParametersService,
    private readonly listGraphicResources: ListGraphicResourcesService,
    private readonly getGraphicResource: GetGraphicResourceService,
    private readonly saveGraphicResource: SaveGraphicResourceService,
  ) {}

  @Get('parameters')
  @RequirePermission('settings', 'read')
  parameters() {
    return this.getParameters.execute()
  }

  @Put('parameters/alert-threshold')
  @RequirePermission('settings', 'write')
  async putAlertThreshold(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(alertThresholdInputSchema)) body: AlertThresholdInput,
  ) {
    await this.saveParameters.execute(request.user, { [ALERT_THRESHOLD_KEY]: body.days })
    return this.getParameters.execute()
  }

  @Put('parameters/medical-validity')
  @RequirePermission('settings', 'write')
  async putMedicalValidity(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(medicalValidityInputSchema)) body: MedicalValidityInput,
  ) {
    await this.saveParameters.execute(request.user, {
      [MEDICAL_VALIDITY_KEYS.clase_1]: body.clase_1,
      [MEDICAL_VALIDITY_KEYS.clase_2]: body.clase_2,
      [MEDICAL_VALIDITY_KEYS.clase_3]: body.clase_3,
    })
    return this.getParameters.execute()
  }

  @Get('graphic-resources')
  @RequirePermission('settings', 'read')
  graphicResources() {
    return this.listGraphicResources.execute()
  }

  @Get('graphic-resources/:kind')
  @RequirePermission('settings', 'read')
  async graphicResource(@Param('kind', kindPipe) kind: GraphicResourceKind, @Res({ passthrough: true }) res: Response) {
    const { mime, data } = await this.getGraphicResource.execute(kind)
    res.setHeader('Cache-Control', 'no-store')
    return new StreamableFile(data, { type: mime, length: data.length })
  }

  /** Body: the raw PNG or JPEG, with its Content-Type (read by RawImageBodyMiddleware). */
  @Put('graphic-resources/:kind')
  @RequirePermission('settings', 'write')
  putGraphicResource(
    @Req() request: AuthenticatedRequest,
    @Param('kind', kindPipe) kind: GraphicResourceKind,
    @Headers('content-type') contentType: string | undefined,
  ) {
    const body: unknown = request.body
    return this.saveGraphicResource.execute(request.user, kind, contentType, Buffer.isBuffer(body) ? body : null)
  }
}
