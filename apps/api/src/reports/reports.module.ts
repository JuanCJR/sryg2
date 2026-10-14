import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AUDIT_LOG, AuditModule } from '../audit/audit.module'
import type { AuditLog } from '../audit/domain/audit-log'
import { DB } from '../infrastructure/database/database.module'
import {
  ACTIVE_BLOCK_QUERY,
  CredentialsCoreModule,
  VALIDITY_PARAMETERS_READER,
} from '../shared/credentials/credentials-core.module'
import type { ActiveBlockQuery } from '../shared/credentials/domain/active-block-query'
import type { ValidityParametersReader } from '../shared/credentials/domain/validity-parameters-reader'
import { ExportReportUseCase } from './application/export-report.use-case'
import { GetReportUseCase } from './application/get-report.use-case'
import { ReportGenerator } from './application/report-generator'
import type { Clock } from './domain/clock'
import type { ReportDataSource } from './domain/report-dataset'
import { ReportsController } from './http/reports.controller'
import { CsvReportRenderer } from './infrastructure/csv-report-renderer'
import { DrizzleReportDataSource } from './infrastructure/drizzle-report-data-source'
import { PdfKitReportRenderer } from './infrastructure/pdfkit-report-renderer'

const REPORT_DATA_SOURCE = Symbol('REPORT_DATA_SOURCE')
const CLOCK = Symbol('CLOCK')

/** The three v1 reports of D10 with CSV and PDF export; see README.md. */
@Module({
  imports: [AuditModule, CredentialsCoreModule],
  controllers: [ReportsController],
  providers: [
    { provide: REPORT_DATA_SOURCE, inject: [DB], useFactory: (db: Db) => new DrizzleReportDataSource(db) },
    { provide: CLOCK, useValue: { now: () => new Date() } satisfies Clock },
    {
      provide: ReportGenerator,
      inject: [REPORT_DATA_SOURCE, VALIDITY_PARAMETERS_READER, ACTIVE_BLOCK_QUERY, CLOCK],
      useFactory: (
        source: ReportDataSource,
        params: ValidityParametersReader,
        blocks: ActiveBlockQuery,
        clock: Clock,
      ) => new ReportGenerator(source, params, blocks, clock),
    },
    {
      provide: GetReportUseCase,
      inject: [ReportGenerator],
      useFactory: (generator: ReportGenerator) => new GetReportUseCase(generator),
    },
    {
      provide: ExportReportUseCase,
      inject: [ReportGenerator, REPORT_DATA_SOURCE, AUDIT_LOG],
      useFactory: (generator: ReportGenerator, source: ReportDataSource, audit: AuditLog) =>
        new ExportReportUseCase(generator, source, [new CsvReportRenderer(), new PdfKitReportRenderer()], audit),
    },
  ],
})
export class ReportsModule {}
