import type { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from './config/env.schema'
import { DomainExceptionFilter } from './shared/http/domain-exception.filter'

/** Shared by main.ts and integration tests so both exercise the same HTTP behavior. */
export function configureApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService)
  // Behind the Render proxy the client IP comes from X-Forwarded-For; needed for per-IP login throttling.
  app.getHttpAdapter().getInstance().set('trust proxy', 1)
  app.setGlobalPrefix('api', { exclude: ['health', 'health/ready'] })
  // Exact-origin allow list; bearer tokens only, so no credentials/cookies.
  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
    // PUT and DELETE: photo, signature and attachment endpoints of the personnel file (W1-4).
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    // The web login reads it on 429 to show the throttle countdown.
    exposedHeaders: ['Retry-After'],
    credentials: false,
  })
  app.useGlobalFilters(new DomainExceptionFilter())
  app.enableShutdownHooks()
  return app
}
