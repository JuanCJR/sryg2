import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditModule } from '../audit/audit.module'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { GetBlockUseCase } from './application/get-block.use-case'
import { ListBlocksUseCase } from './application/list-blocks.use-case'
import { RegisterBlockUseCase } from './application/register-block.use-case'
import { ResolveBlockUseCase } from './application/resolve-block.use-case'
import type { BlockRepository } from './domain/block-repository'
import type { BlockingUnitOfWork } from './domain/blocking-unit-of-work'
import { BlocksController } from './http/blocks.controller'
import { DrizzleBlockRepository } from './infrastructure/drizzle-block.repository'

const BLOCK_READER = Symbol('BLOCK_READER')
const BLOCKING_UOW = Symbol('BLOCKING_UOW')

/** Registers and resolves blocks (W1-3); see README.md. */
@Module({
  imports: [AuditModule],
  controllers: [BlocksController],
  providers: [
    { provide: BLOCK_READER, inject: [DB], useFactory: (db: Db) => new DrizzleBlockRepository(db) },
    {
      provide: BLOCKING_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          blocks: new DrizzleBlockRepository(tx),
          audit: new DrizzleAuditLog(tx),
        })),
    },
    {
      provide: RegisterBlockUseCase,
      inject: [BLOCKING_UOW],
      useFactory: (uow: BlockingUnitOfWork) => new RegisterBlockUseCase(uow),
    },
    {
      provide: ResolveBlockUseCase,
      inject: [BLOCKING_UOW],
      useFactory: (uow: BlockingUnitOfWork) => new ResolveBlockUseCase(uow),
    },
    {
      provide: GetBlockUseCase,
      inject: [BLOCK_READER],
      useFactory: (repo: BlockRepository) => new GetBlockUseCase(repo),
    },
    {
      provide: ListBlocksUseCase,
      inject: [BLOCK_READER],
      useFactory: (repo: BlockRepository) => new ListBlocksUseCase(repo),
    },
  ],
})
export class ValidationBlockingModule {}
