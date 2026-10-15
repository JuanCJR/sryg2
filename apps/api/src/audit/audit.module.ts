import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DB } from '../infrastructure/database/database.module'
import { ExportAuditSheetUseCase } from './application/export-audit-sheet.use-case'
import { ListAuditEntriesUseCase } from './application/list-audit-entries.use-case'
import type { AuditTrailReader } from './domain/audit-trail'
import { AuditController } from './http/audit.controller'
import { DrizzleAuditLog } from './infrastructure/drizzle-audit-log'
import { DrizzleAuditTrailReader } from './infrastructure/drizzle-audit-trail.reader'

export const AUDIT_LOG = Symbol('AUDIT_LOG')
const AUDIT_TRAIL_READER = Symbol('AUDIT_TRAIL_READER')

/**
 * The write port for events that are not part of an entity mutation (e.g. authentication), plus the
 * read-only viewer and Excel export of the trail (W1-7).
 */
@Module({
  controllers: [AuditController],
  providers: [
    { provide: AUDIT_LOG, inject: [DB], useFactory: (db: Db) => new DrizzleAuditLog(db) },
    { provide: AUDIT_TRAIL_READER, inject: [DB], useFactory: (db: Db) => new DrizzleAuditTrailReader(db) },
    {
      provide: ListAuditEntriesUseCase,
      inject: [AUDIT_TRAIL_READER],
      useFactory: (trail: AuditTrailReader) => new ListAuditEntriesUseCase(trail),
    },
    {
      provide: ExportAuditSheetUseCase,
      inject: [AUDIT_TRAIL_READER],
      useFactory: (trail: AuditTrailReader) => new ExportAuditSheetUseCase(trail),
    },
  ],
  exports: [AUDIT_LOG],
})
export class AuditModule {}
