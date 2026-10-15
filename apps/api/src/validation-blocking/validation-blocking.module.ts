import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditModule } from '../audit/audit.module'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import { BlocksController } from './controllers/blocks.controller'
import { BlockRepository } from './repositories/block.repository'
import { GetBlockService } from './services/get-block.service'
import { ListBlocksService } from './services/list-blocks.service'
import { RegisterBlockService } from './services/register-block.service'
import { ResolveBlockService } from './services/resolve-block.service'
import type { BlockingTransaction } from './validation-blocking.types'

const BLOCKING_TRANSACTION = Symbol('BLOCKING_TRANSACTION')

/** Registers and resolves blocks (W1-3); see README.md. */
@Module({
  imports: [AuditModule],
  controllers: [BlocksController],
  providers: [
    { provide: BlockRepository, inject: [DB], useFactory: (db: Db) => new BlockRepository(db) },
    {
      provide: BLOCKING_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          blocks: new BlockRepository(tx),
          audit: new AuditLogRepository(tx),
        })),
    },
    {
      provide: RegisterBlockService,
      inject: [BLOCKING_TRANSACTION],
      useFactory: (transaction: BlockingTransaction) => new RegisterBlockService(transaction),
    },
    {
      provide: ResolveBlockService,
      inject: [BLOCKING_TRANSACTION],
      useFactory: (transaction: BlockingTransaction) => new ResolveBlockService(transaction),
    },
    {
      provide: GetBlockService,
      inject: [BlockRepository],
      useFactory: (repo: BlockRepository) => new GetBlockService(repo),
    },
    {
      provide: ListBlocksService,
      inject: [BlockRepository],
      useFactory: (repo: BlockRepository) => new ListBlocksService(repo),
    },
  ],
})
export class ValidationBlockingModule {}
