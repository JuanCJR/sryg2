import type { INestApplication, Type } from '@nestjs/common'
import { vi } from 'vitest'

const BASE_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://sryg:sryg@localhost:5432/sryg',
  JWT_SECRET: 'test-only-jwt-secret-with-at-least-32-bytes',
  CORS_ORIGIN: 'http://allowed.test',
  // High limit so suites that log in repeatedly never trip the login throttle.
  LOGIN_THROTTLE_LIMIT: '1000',
}

/**
 * Boots the real AppModule through configureApp. The env is read when the config module is
 * imported, so modules are re-imported after applying `env` overrides. `controllers` adds
 * test-only routes, which go through the same global guards as the real ones.
 */
export async function createTestApp(
  env: Record<string, string> = {},
  controllers: Type[] = [],
): Promise<INestApplication> {
  Object.assign(process.env, BASE_ENV, env)
  vi.resetModules()
  const { Test } = await import('@nestjs/testing')
  const { AppModule } = await import('../app.module.js')
  const { configureApp } = await import('../configure-app.js')
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers }).compile()
  const app = configureApp(moduleRef.createNestApplication())
  await app.init()
  return app
}
