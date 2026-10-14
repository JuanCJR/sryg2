import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule } from '@nestjs/throttler'
import { AUDIT_LOG, AuditModule } from '../audit/audit.module'
import type { AuditLog } from '../audit/domain/audit-log'
import type { Env } from '../config/env.schema'
import type { Db } from '@sryg/db'
import { DB } from '../infrastructure/database/database.module'
import { ChangePasswordUseCase } from './application/change-password.use-case'
import { GetAccessLogUseCase } from './application/get-access-log.use-case'
import { GetCurrentUserUseCase } from './application/get-current-user.use-case'
import { LoginUseCase } from './application/login.use-case'
import type { AccessLog, AccessLogReader } from './domain/access-log'
import type { AccountUnitOfWork } from './domain/account-unit-of-work'
import type { PasswordHasher } from './domain/password-hasher'
import type { TokenIssuer } from './domain/token-issuer'
import type { UserRepository } from './domain/user-repository'
import { AuthController } from './http/auth.controller'
import { JwtAuthGuard } from './http/jwt-auth.guard'
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher'
import { DrizzleAccessLog } from './infrastructure/drizzle-access-log'
import { DrizzlePasswordWriter } from './infrastructure/drizzle-password-writer'
import { DrizzleAuditLog } from '../audit/infrastructure/drizzle-audit-log'
import { DrizzleUnitOfWork } from '../infrastructure/database/drizzle-unit-of-work'
import { DrizzleUserRepository } from './infrastructure/drizzle-user.repository'
import { JwtTokenIssuer } from './infrastructure/jwt-token-issuer'
import { PermissionGuard } from '../shared/http/permission.guard'

type Config = ConfigService<Env, true>
const ACCESS_LOG = Symbol('ACCESS_LOG')
const ACCOUNT_UOW = Symbol('ACCOUNT_UOW')

@Module({
  imports: [
    AuditModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
    // Throttling is applied to login only (ThrottlerGuard on that route), not globally.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Config) => [
        {
          limit: config.get('LOGIN_THROTTLE_LIMIT', { infer: true }),
          ttl: config.get('LOGIN_THROTTLE_TTL', { infer: true }) * 1000,
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Order matters: authenticate first, then check the permission matrix.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
    DrizzleUserRepository,
    JwtTokenIssuer,
    Argon2PasswordHasher,
    { provide: ACCESS_LOG, inject: [DB], useFactory: (db: Db) => new DrizzleAccessLog(db) },
    {
      provide: LoginUseCase,
      inject: [DrizzleUserRepository, Argon2PasswordHasher, JwtTokenIssuer, AUDIT_LOG, ACCESS_LOG],
      // The dummy hash uses the real parameters so unknown-email logins cost the same as real ones.
      useFactory: async (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenIssuer,
        audit: AuditLog,
        access: AccessLog,
      ) =>
        new LoginUseCase(users, hasher, tokens, await hasher.hash('dummy-password-for-timing-parity'), audit, access),
    },
    {
      provide: GetCurrentUserUseCase,
      inject: [DrizzleUserRepository],
      useFactory: (users: UserRepository) => new GetCurrentUserUseCase(users),
    },
    {
      provide: ACCOUNT_UOW,
      inject: [DB],
      useFactory: (db: Db) =>
        new DrizzleUnitOfWork(db, (tx) => ({
          passwords: new DrizzlePasswordWriter(tx),
          audit: new DrizzleAuditLog(tx),
        })),
    },
    {
      provide: ChangePasswordUseCase,
      inject: [DrizzleUserRepository, Argon2PasswordHasher, ACCOUNT_UOW],
      useFactory: (users: UserRepository, hasher: PasswordHasher, uow: AccountUnitOfWork) =>
        new ChangePasswordUseCase(users, hasher, uow),
    },
    {
      provide: GetAccessLogUseCase,
      inject: [ACCESS_LOG],
      useFactory: (reader: AccessLogReader) => new GetAccessLogUseCase(reader),
    },
  ],
})
export class AuthModule {}
