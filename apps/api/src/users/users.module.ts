import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import { Argon2PasswordHasher } from '../auth/services/argon2-password-hasher'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import { UsersController } from './controllers/users.controller'
import { UserAdminRepository } from './repositories/user-admin.repository'
import { CreateUserService } from './services/create-user.service'
import { CryptoTemporaryPasswordGenerator } from './services/crypto-temporary-password-generator'
import { ListUsersService } from './services/list-users.service'
import { ResetUserPasswordService } from './services/reset-user-password.service'
import { UpdateUserService } from './services/update-user.service'
import type { UsersTransaction } from './users.types'

const USERS_TRANSACTION = Symbol('USERS_TRANSACTION')

@Module({
  controllers: [UsersController],
  providers: [
    Argon2PasswordHasher,
    CryptoTemporaryPasswordGenerator,
    { provide: UserAdminRepository, inject: [DB], useFactory: (db: Db) => new UserAdminRepository(db) },
    {
      provide: USERS_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          users: new UserAdminRepository(tx),
          audit: new AuditLogRepository(tx),
        })),
    },
    {
      provide: ListUsersService,
      inject: [UserAdminRepository],
      useFactory: (users: UserAdminRepository) => new ListUsersService(users),
    },
    {
      provide: CreateUserService,
      inject: [USERS_TRANSACTION, Argon2PasswordHasher, CryptoTemporaryPasswordGenerator],
      useFactory: (
        transaction: UsersTransaction,
        hasher: Argon2PasswordHasher,
        passwords: CryptoTemporaryPasswordGenerator,
      ) => new CreateUserService(transaction, hasher, passwords),
    },
    {
      provide: UpdateUserService,
      inject: [USERS_TRANSACTION],
      useFactory: (transaction: UsersTransaction) => new UpdateUserService(transaction),
    },
    {
      provide: ResetUserPasswordService,
      inject: [USERS_TRANSACTION, Argon2PasswordHasher, CryptoTemporaryPasswordGenerator],
      useFactory: (
        transaction: UsersTransaction,
        hasher: Argon2PasswordHasher,
        passwords: CryptoTemporaryPasswordGenerator,
      ) => new ResetUserPasswordService(transaction, hasher, passwords),
    },
  ],
})
export class UsersModule {}
