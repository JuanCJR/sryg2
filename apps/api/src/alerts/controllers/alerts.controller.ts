import { Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common'
import { type AlertsQuery, alertsQuerySchema, type AlertsSummaryQuery, alertsSummaryQuerySchema } from '@sryg/types'
import { z } from 'zod'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { AcknowledgeAlertService } from '../services/acknowledge-alert.service'
import { GetAlertsSummaryService } from '../services/get-alerts-summary.service'
import { ListAlertsService } from '../services/list-alerts.service'

/**
 * Every role reads alerts (D1 §4: "Alerts & dashboard: R" for all). The matrix defines no write on
 * alerts, so acknowledging (ALR-06) only needs that read access; see the module README.
 */
@Controller('alerts')
@RequirePermission('alerts', 'read')
export class AlertsController {
  constructor(
    private readonly listAlerts: ListAlertsService,
    private readonly getSummary: GetAlertsSummaryService,
    private readonly acknowledgeAlert: AcknowledgeAlertService,
  ) {}

  @Get()
  list(@Query(new ZodValidationPipe(alertsQuerySchema)) query: AlertsQuery) {
    return this.listAlerts.execute(query)
  }

  @Get('summary')
  summary(@Query(new ZodValidationPipe(alertsSummaryQuerySchema)) query: AlertsSummaryQuery) {
    return this.getSummary.execute(query)
  }

  @Post(':id/acknowledge')
  @HttpCode(200)
  acknowledge(@Req() request: AuthenticatedRequest, @Param('id', new ZodValidationPipe(z.uuid())) id: string) {
    return this.acknowledgeAlert.execute(request.user, id)
  }
}
