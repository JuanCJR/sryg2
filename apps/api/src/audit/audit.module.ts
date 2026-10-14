import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleAuditLog } from './infrastructure/drizzle-audit-log'

export const AUDIT_LOG = Symbol('AUDIT_LOG')

/** Pool-backed audit log for events that are not part of an entity mutation (e.g. authentication). */
@Module({
  providers: [{ provide: AUDIT_LOG, inject: [DB], useFactory: (db: Db) => new DrizzleAuditLog(db) }],
  exports: [AUDIT_LOG],
})
export class AuditModule {}
