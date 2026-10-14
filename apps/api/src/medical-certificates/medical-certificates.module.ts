import { Module } from '@nestjs/common'
import { CredentialsCoreModule } from '../shared/credentials/credentials-core.module'

/** Skeleton registered by the foundation (F0-A); see README.md. */
@Module({ imports: [CredentialsCoreModule] })
export class MedicalCertificatesModule {}
