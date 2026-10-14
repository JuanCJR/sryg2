import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import { resolve } from 'node:path'
import { validateEnv } from './env.schema'

// Root .env is the single local source (absent on Render, where real env vars are injected).
const envFilePath = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]

@Module({
  imports: [NestConfigModule.forRoot({ isGlobal: true, envFilePath, validate: validateEnv })],
})
export class ConfigModule {}
