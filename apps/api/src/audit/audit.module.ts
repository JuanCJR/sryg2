import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DB } from '../common/database/database.module'
import { AuditController } from './controllers/audit.controller'
import { AuditLogRepository } from './repositories/audit-log.repository'
import { AuditTrailRepository } from './repositories/audit-trail.repository'
import { ExportAuditCsvService } from './services/export-audit-csv.service'
import { ListAuditEntriesService } from './services/list-audit-entries.service'

/**
 * The audit writer for events that are not part of an entity mutation (e.g. authentication), plus
 * the read-only viewer and CSV export of the trail (W1-7).
 */
@Module({
  controllers: [AuditController],
  providers: [
    { provide: AuditLogRepository, inject: [DB], useFactory: (db: Db) => new AuditLogRepository(db) },
    { provide: AuditTrailRepository, inject: [DB], useFactory: (db: Db) => new AuditTrailRepository(db) },
    {
      provide: ListAuditEntriesService,
      inject: [AuditTrailRepository],
      useFactory: (trail: AuditTrailRepository) => new ListAuditEntriesService(trail),
    },
    {
      provide: ExportAuditCsvService,
      inject: [AuditTrailRepository],
      useFactory: (trail: AuditTrailRepository) => new ExportAuditCsvService(trail),
    },
  ],
  exports: [AuditLogRepository],
})
export class AuditModule {}
