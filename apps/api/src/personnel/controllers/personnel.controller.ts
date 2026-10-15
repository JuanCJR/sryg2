import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  type CreatePersonnelInput,
  createPersonnelSchema,
  type ListQuery,
  listQuerySchema,
  PERSONNEL_IMAGE_UPLOAD_MAX_BYTES,
  type PersonnelImageKind,
  type UpdatePersonnelInput,
  updatePersonnelSchema,
} from '@sryg/types'
import { z } from 'zod'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { IncomingFile } from '../dtos/personnel-file.dto'
import { CreatePersonnelService } from '../services/create-personnel.service'
import { DeletePersonnelService } from '../services/delete-personnel.service'
import { GetPersonnelService } from '../services/get-personnel.service'
import { ListPersonnelService } from '../services/list-personnel.service'
import { GetPersonnelImageService, SetPersonnelImageService } from '../services/personnel-images.service'
import { UpdatePersonnelService } from '../services/update-personnel.service'
import { PersonnelExceptionFilter } from './personnel-exception.filter'

const idPipe = new ZodValidationPipe(z.uuid())
// Multer keeps the upload in memory; over the limit it answers 413 before the service runs.
const imageUpload = FileInterceptor('file', { limits: { fileSize: PERSONNEL_IMAGE_UPLOAD_MAX_BYTES, files: 1 } })

/** Every role reads; Admin and Supervisors of any area write (D1, D24). */
@Controller('personnel')
@UseFilters(PersonnelExceptionFilter)
export class PersonnelController {
  constructor(
    private readonly createPersonnel: CreatePersonnelService,
    private readonly updatePersonnel: UpdatePersonnelService,
    private readonly getPersonnel: GetPersonnelService,
    private readonly listPersonnel: ListPersonnelService,
    private readonly deletePersonnel: DeletePersonnelService,
    private readonly setImage: SetPersonnelImageService,
    private readonly getImage: GetPersonnelImageService,
  ) {}

  @Get()
  @RequirePermission('personnel', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.listPersonnel.execute(query)
  }

  @Get(':id')
  @RequirePermission('personnel', 'read')
  get(@Param('id', idPipe) id: string) {
    return this.getPersonnel.execute(id)
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('personnel', 'write')
  create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPersonnelSchema)) body: CreatePersonnelInput,
  ) {
    return this.createPersonnel.execute(request.user, body)
  }

  @Patch(':id')
  @RequirePermission('personnel', 'write')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updatePersonnelSchema)) body: UpdatePersonnelInput,
  ) {
    return this.updatePersonnel.execute(request.user, id, body)
  }

  /** 409 while the person holds credentials or is referenced by a block (BR-10). */
  @Delete(':id')
  @HttpCode(204)
  @RequirePermission('personnel', 'write')
  async remove(@Req() request: AuthenticatedRequest, @Param('id', idPipe) id: string): Promise<void> {
    await this.deletePersonnel.execute(request.user, id)
  }

  // Photo and signature (D5): multipart `file`, compressed by the server; GET serves the stored bytes.
  @Get(':id/photo')
  @RequirePermission('personnel', 'read')
  photo(@Param('id', idPipe) id: string) {
    return this.image(id, 'photo')
  }

  @Put(':id/photo')
  @RequirePermission('personnel', 'write')
  @UseInterceptors(imageUpload)
  putPhoto(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @UploadedFile() file: IncomingFile | undefined,
  ) {
    return this.setImage.execute(request.user, id, 'photo', file)
  }

  @Get(':id/signature')
  @RequirePermission('personnel', 'read')
  signature(@Param('id', idPipe) id: string) {
    return this.image(id, 'signature')
  }

  @Put(':id/signature')
  @RequirePermission('personnel', 'write')
  @UseInterceptors(imageUpload)
  putSignature(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @UploadedFile() file: IncomingFile | undefined,
  ) {
    return this.setImage.execute(request.user, id, 'signature', file)
  }

  private async image(id: string, kind: PersonnelImageKind) {
    const { data, mime } = await this.getImage.execute(id, kind)
    // Behind a bearer token: private, and revalidated because a PUT replaces it in place.
    return new StreamableFile(data, { type: mime, length: data.length, disposition: 'inline' })
  }
}
