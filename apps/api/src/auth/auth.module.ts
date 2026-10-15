import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerModule } from '@nestjs/throttler'
import type { Db } from '@sryg/db'
import { AuditModule } from '../audit/audit.module'
import { AuditLogRepository } from '../audit/repositories/audit-log.repository'
import type { Env } from '../common/config/env.schema'
import { DB } from '../common/database/database.module'
import { TransactionRunner } from '../common/database/transaction-runner'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { PermissionGuard } from '../common/guards/permission.guard'
import type { AccountTransaction } from './auth.types'
import { AuthController } from './controllers/auth.controller'
import { AccessLogRepository } from './repositories/access-log.repository'
import { PasswordRepository } from './repositories/password.repository'
import { UserRepository } from './repositories/user.repository'
import { Argon2PasswordHasher } from './services/argon2-password-hasher'
import { ChangePasswordService } from './services/change-password.service'
import { GetAccessLogService } from './services/get-access-log.service'
import { GetCurrentUserService } from './services/get-current-user.service'
import { JwtTokenIssuer } from './services/jwt-token-issuer'
import { LoginService } from './services/login.service'

type Config = ConfigService<Env, true>
const ACCOUNT_TRANSACTION = Symbol('ACCOUNT_TRANSACTION')

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
    UserRepository,
    JwtTokenIssuer,
    Argon2PasswordHasher,
    { provide: AccessLogRepository, inject: [DB], useFactory: (db: Db) => new AccessLogRepository(db) },
    {
      provide: LoginService,
      inject: [UserRepository, Argon2PasswordHasher, JwtTokenIssuer, AuditLogRepository, AccessLogRepository],
      // The dummy hash uses the real parameters so unknown-email logins cost the same as real ones.
      useFactory: async (
        users: UserRepository,
        hasher: Argon2PasswordHasher,
        tokens: JwtTokenIssuer,
        audit: AuditLogRepository,
        access: AccessLogRepository,
      ) =>
        new LoginService(users, hasher, tokens, await hasher.hash('dummy-password-for-timing-parity'), audit, access),
    },
    {
      provide: GetCurrentUserService,
      inject: [UserRepository],
      useFactory: (users: UserRepository) => new GetCurrentUserService(users),
    },
    {
      provide: ACCOUNT_TRANSACTION,
      inject: [DB],
      useFactory: (db: Db) =>
        new TransactionRunner(db, (tx) => ({
          passwords: new PasswordRepository(tx),
          audit: new AuditLogRepository(tx),
        })),
    },
    {
      provide: ChangePasswordService,
      inject: [UserRepository, Argon2PasswordHasher, ACCOUNT_TRANSACTION],
      useFactory: (users: UserRepository, hasher: Argon2PasswordHasher, transaction: AccountTransaction) =>
        new ChangePasswordService(users, hasher, transaction),
    },
    {
      provide: GetAccessLogService,
      inject: [AccessLogRepository],
      useFactory: (reader: AccessLogRepository) => new GetAccessLogService(reader),
    },
  ],
})
export class AuthModule {}
