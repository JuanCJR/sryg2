import { Controller, Get, Param, Req, Res } from '@nestjs/common'
import type { Response } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../auth/http/jwt-auth.guard'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { type CredentialPdf, IssueCredentialPdfUseCase } from '../application/issue-credential-pdf.use-case'

const idPipe = new ZodValidationPipe(z.uuid())

function send(response: Response, { filename, body }: CredentialPdf) {
  response
    .status(200)
    .set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    })
    .send(body)
}

/**
 * OUT-05: the card PDFs of one person (D7). Admin and Supervisors print (`credentials:export`); a
 * Supervisor only the cards of their area, which the use case checks (D24).
 */
@Controller('personnel/:personalId/credentials')
export class CredentialsController {
  constructor(private readonly issuePdf: IssueCredentialPdfUseCase) {}

  @Get('license/:licenseId.pdf')
  @RequirePermission('credentials', 'export')
  async license(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
    @Param('personalId', idPipe) personalId: string,
    @Param('licenseId', idPipe) licenseId: string,
  ) {
    send(response, await this.issuePdf.execute(request.user, { personalId, kind: 'license', credentialId: licenseId }))
  }

  @Get('medical/:certId.pdf')
  @RequirePermission('credentials', 'export')
  async medical(
    @Req() request: AuthenticatedRequest,
    @Res() response: Response,
    @Param('personalId', idPipe) personalId: string,
    @Param('certId', idPipe) certId: string,
  ) {
    send(response, await this.issuePdf.execute(request.user, { personalId, kind: 'medical', credentialId: certId }))
  }
}
