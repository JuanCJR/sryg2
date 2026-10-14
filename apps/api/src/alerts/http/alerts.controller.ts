import { Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common'
import { type AlertsQuery, alertsQuerySchema, type AlertsSummaryQuery, alertsSummaryQuerySchema } from '@sryg/types'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../auth/http/jwt-auth.guard'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { AcknowledgeAlertUseCase } from '../application/acknowledge-alert.use-case'
import { GetAlertsSummaryUseCase } from '../application/get-alerts-summary.use-case'
import { ListAlertsUseCase } from '../application/list-alerts.use-case'

/**
 * Every role reads alerts (D1 §4: "Alerts & dashboard: R" for all). The matrix defines no write on
 * alerts, so acknowledging (ALR-06) only needs that read access; see the module README.
 */
@Controller('alerts')
@RequirePermission('alerts', 'read')
export class AlertsController {
  constructor(
    private readonly listAlerts: ListAlertsUseCase,
    private readonly getSummary: GetAlertsSummaryUseCase,
    private readonly acknowledgeAlert: AcknowledgeAlertUseCase,
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
