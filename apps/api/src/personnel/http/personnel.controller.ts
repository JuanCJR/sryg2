import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common'
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
import { GetPersonnelUseCase } from '../application/get-personnel.use-case'
import { ListPersonnelUseCase } from '../application/list-personnel.use-case'
import { UpdatePersonnelUseCase } from '../application/update-personnel.use-case'

const idPipe = new ZodValidationPipe(z.uuid())

/** Every role reads; Admin and Supervisors of any area write (D1, D24). */
@Controller('personnel')
export class PersonnelController {
  constructor(
    private readonly createPersonnel: CreatePersonnelUseCase,
    private readonly updatePersonnel: UpdatePersonnelUseCase,
    private readonly getPersonnel: GetPersonnelUseCase,
    private readonly listPersonnel: ListPersonnelUseCase,
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
}
