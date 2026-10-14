import { Module } from '@nestjs/common'
import type { Db } from '@sryg/db'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import type { PasswordHasher } from '../auth/domain/password-hasher'
import { Argon2PasswordHasher } from '../auth/infrastructure/argon2-password-hasher'
import { DB } from '../infrastructure/database/database.module'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { CreateUserUseCase } from './application/create-user.use-case'
import { ListUsersUseCase } from './application/list-users.use-case'
import { ResetUserPasswordUseCase } from './application/reset-user-password.use-case'
import { UpdateUserUseCase } from './application/update-user.use-case'
import type { TemporaryPasswordGenerator } from './domain/temporary-password-generator'
import type { UserAdminRepository } from './domain/user-admin-repository'
import type { UsersUnitOfWork } from './domain/users-unit-of-work'
import { UsersController } from './http/users.controller'
import { CryptoTemporaryPasswordGenerator } from './infrastructure/crypto-temporary-password-generator'
import { DrizzleUserAdminRepository } from './infrastructure/drizzle-user-admin.repository'

const USERS_READER = Symbol('USERS_READER')
const USERS_UOW = Symbol('USERS_UOW')

@Module({
  controllers: [UsersController],
  providers: [
    Argon2PasswordHasher,
    CryptoTemporaryPasswordGenerator,
    { provide: USERS_READER, inject: [DB], useFactory: (db: Db) => new DrizzleUserAdminRepository(db) },
    {
      provide: USERS_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          users: new DrizzleUserAdminRepository(tx),
          audit: new DrizzleAuditLog(tx),
        })),
    },
    {
      provide: ListUsersUseCase,
      inject: [USERS_READER],
      useFactory: (users: UserAdminRepository) => new ListUsersUseCase(users),
    },
    {
      provide: CreateUserUseCase,
      inject: [USERS_UOW, Argon2PasswordHasher, CryptoTemporaryPasswordGenerator],
      useFactory: (uow: UsersUnitOfWork, hasher: PasswordHasher, passwords: TemporaryPasswordGenerator) =>
        new CreateUserUseCase(uow, hasher, passwords),
    },
    {
      provide: UpdateUserUseCase,
      inject: [USERS_UOW],
      useFactory: (uow: UsersUnitOfWork) => new UpdateUserUseCase(uow),
    },
    {
      provide: ResetUserPasswordUseCase,
      inject: [USERS_UOW, Argon2PasswordHasher, CryptoTemporaryPasswordGenerator],
      useFactory: (uow: UsersUnitOfWork, hasher: PasswordHasher, passwords: TemporaryPasswordGenerator) =>
        new ResetUserPasswordUseCase(uow, hasher, passwords),
    },
  ],
})
export class UsersModule {}
