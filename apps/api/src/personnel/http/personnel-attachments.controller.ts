import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ATTACHMENT_MAX_BYTES, type AttachmentUploadInput, attachmentUploadSchema } from '@sryg/types'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../auth/http/jwt-auth.guard'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { PersonnelAttachmentsUseCases } from '../application/personnel-attachments.use-cases'
import type { IncomingFile } from '../domain/personnel-file'
import { PersonnelExceptionFilter } from './personnel-exception.filter'

const idPipe = new ZodValidationPipe(z.uuid())

/** `filename*` carries the UTF-8 name; `filename` an ASCII fallback for older clients (RFC 6266). */
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

/** Documents of the person's file (D21). Every role reads; Admin and Supervisors write (D1, D24). */
@Controller('personnel/:id/attachments')
@UseFilters(PersonnelExceptionFilter)
export class PersonnelAttachmentsController {
  constructor(private readonly attachments: PersonnelAttachmentsUseCases) {}

  @Get()
  @RequirePermission('personnel', 'read')
  list(@Param('id', idPipe) id: string) {
    return this.attachments.list(id)
  }

  @Get(':attachmentId')
  @RequirePermission('personnel', 'read')
  @Header('X-Content-Type-Options', 'nosniff')
  async download(@Param('id', idPipe) id: string, @Param('attachmentId', idPipe) attachmentId: string) {
    const { data, mime, filename } = await this.attachments.download(id, attachmentId)
    return new StreamableFile(data, { type: mime, length: data.length, disposition: contentDisposition(filename) })
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('personnel', 'write')
  // Multer answers 413 over the limit; utf8 keeps accented file names intact.
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 }, defParamCharset: 'utf8' }),
  )
  upload(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(attachmentUploadSchema)) body: AttachmentUploadInput,
    @UploadedFile() file: IncomingFile | undefined,
  ) {
    return this.attachments.upload(request.user, id, body, file)
  }

  @Delete(':attachmentId')
  @HttpCode(204)
  @RequirePermission('personnel', 'write')
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Param('attachmentId', idPipe) attachmentId: string,
  ): Promise<void> {
    await this.attachments.remove(request.user, id, attachmentId)
  }
}
