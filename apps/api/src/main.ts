import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import type { Env } from './common/config/env.schema'
import { configureApp } from './configure-app'

async function bootstrap() {
  // abortOnError false: surface config errors as a normal non-zero exit instead of process.abort().
  const app = configureApp(await NestFactory.create(AppModule, { abortOnError: false }))
  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true })
  await app.listen(port)
}

bootstrap().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
