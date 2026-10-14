import { Body, Controller, Get, HttpCode, Param, Post, Req, UseFilters } from '@nestjs/common'
import {
  type RegisterMedicalCertificateInput,
  registerMedicalCertificateSchema,
  type RenewMedicalCertificateInput,
  renewMedicalCertificateSchema,
} from '@sryg/types'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../auth/http/jwt-auth.guard'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import {
  GetMedicalCertificateHistoryUseCase,
  GetMedicalCertificateUseCase,
  GetMedicalValidityUseCase,
  ListPersonMedicalCertificatesUseCase,
} from '../application/read-medical-certificates.use-cases'
import { RegisterMedicalCertificateUseCase } from '../application/register-medical-certificate.use-case'
import { RenewMedicalCertificateUseCase } from '../application/renew-medical-certificate.use-case'
import { InvalidObservationFilter } from './invalid-observation.filter'

const idPipe = new ZodValidationPipe(z.uuid())

/** A holder's certificates. Every role reads; the Admin and the Medicina Supervisor write (D24). */
@Controller('personnel/:personalId/medical-certificates')
@UseFilters(InvalidObservationFilter)
export class PersonMedicalCertificatesController {
  constructor(
    private readonly listCertificates: ListPersonMedicalCertificatesUseCase,
    private readonly registerCertificate: RegisterMedicalCertificateUseCase,
  ) {}

  @Get()
  @RequirePermission('medical_certificates', 'read')
  list(@Param('personalId', idPipe) personalId: string) {
    return this.listCertificates.execute(personalId)
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('medical_certificates', 'write')
  register(
    @Req() request: AuthenticatedRequest,
    @Param('personalId', idPipe) personalId: string,
    @Body(new ZodValidationPipe(registerMedicalCertificateSchema)) body: RegisterMedicalCertificateInput,
  ) {
    return this.registerCertificate.execute(request.user, personalId, body)
  }
}

@Controller('medical-certificates')
@UseFilters(InvalidObservationFilter)
export class MedicalCertificatesController {
  constructor(
    private readonly getCertificate: GetMedicalCertificateUseCase,
    private readonly getValidity: GetMedicalValidityUseCase,
    private readonly getHistory: GetMedicalCertificateHistoryUseCase,
    private readonly renewCertificate: RenewMedicalCertificateUseCase,
  ) {}

  /** Declared before `:id`, which would otherwise capture it. */
  @Get('validity')
  @RequirePermission('medical_certificates', 'read')
  validity() {
    return this.getValidity.execute()
  }

  @Get(':id')
  @RequirePermission('medical_certificates', 'read')
  get(@Param('id', idPipe) id: string) {
    return this.getCertificate.execute(id)
  }

  /** The audit trail of the certificate: whoever may read the audit (Consulta may not: D1). */
  @Get(':id/history')
  @RequirePermission('audit', 'read')
  history(@Param('id', idPipe) id: string) {
    return this.getHistory.execute(id)
  }

  @Post(':id/renew')
  @HttpCode(200)
  @RequirePermission('medical_certificates', 'write')
  renew(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(renewMedicalCertificateSchema)) body: RenewMedicalCertificateInput,
  ) {
    return this.renewCertificate.execute(request.user, id, body)
  }
}
