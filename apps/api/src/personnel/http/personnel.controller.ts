import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseFilters } from '@nestjs/common'
import {
  type CreatePersonnelInput,
  createPersonnelSchema,
  type ListQuery,
  listQuerySchema,
  type UpdatePersonnelInput,
  updatePersonnelSchema,
} from '@sryg/types'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../auth/http/jwt-auth.guard'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { CreatePersonnelUseCase } from '../application/create-personnel.use-case'
import { DeletePersonnelUseCase } from '../application/delete-personnel.use-case'
import { GetPersonnelUseCase } from '../application/get-personnel.use-case'
import { ListPersonnelUseCase } from '../application/list-personnel.use-case'
import { UpdatePersonnelUseCase } from '../application/update-personnel.use-case'
import { PersonnelExceptionFilter } from './personnel-exception.filter'

const idPipe = new ZodValidationPipe(z.uuid())

/** Every role reads; Admin and Supervisors of any area write (D1, D24). */
@Controller('personnel')
@UseFilters(PersonnelExceptionFilter)
export class PersonnelController {
  constructor(
    private readonly createPersonnel: CreatePersonnelUseCase,
    private readonly updatePersonnel: UpdatePersonnelUseCase,
    private readonly getPersonnel: GetPersonnelUseCase,
    private readonly listPersonnel: ListPersonnelUseCase,
    private readonly deletePersonnel: DeletePersonnelUseCase,
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
}
