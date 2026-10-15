import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditModule } from '../audit/audit.module'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { Clock } from '../common/clock'
import { CredentialsCoreModule } from '../common/credentials/credentials-core.module'
import { ActiveBlocksRepository } from '../common/credentials/repositories/active-blocks.repository'
import { ValidityParametersRepository } from '../common/credentials/repositories/validity-parameters.repository'
import { DB } from '../common/database/database.module'
import { ReportsController } from './controllers/reports.controller'
import { ReportDataRepository } from './repositories/report-data.repository'
import { ExportReportService } from './services/export-report.service'
import { GetReportService } from './services/get-report.service'
import { PdfKitReportRenderer } from './services/pdfkit-report-renderer'
import { ReportGenerator } from './services/report-generator'
import { XlsxReportRenderer } from './services/xlsx-report-renderer'

/** The three v1 reports of D10 with Excel and PDF export; see README.md. */
@Module({
  imports: [AuditModule, CredentialsCoreModule],
  controllers: [ReportsController],
  providers: [
    { provide: ReportDataRepository, inject: [DB], useFactory: (db: Db) => new ReportDataRepository(db) },
    Clock,
    {
      provide: ReportGenerator,
      inject: [ReportDataRepository, ValidityParametersRepository, ActiveBlocksRepository, Clock],
      useFactory: (
        source: ReportDataRepository,
        params: ValidityParametersRepository,
        blocks: ActiveBlocksRepository,
        clock: Clock,
      ) => new ReportGenerator(source, params, blocks, clock),
    },
    {
      provide: GetReportService,
      inject: [ReportGenerator],
      useFactory: (generator: ReportGenerator) => new GetReportService(generator),
    },
    {
      provide: ExportReportService,
      inject: [ReportGenerator, ReportDataRepository, AuditLogRepository],
      useFactory: (generator: ReportGenerator, source: ReportDataRepository, audit: AuditLogRepository) =>
        new ExportReportService(generator, source, [new XlsxReportRenderer(), new PdfKitReportRenderer()], audit),
    },
  ],
})
export class ReportsModule {}
