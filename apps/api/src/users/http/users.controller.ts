import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common'
import {
  type CreateUserInput,
  createUserSchema,
  type ListQuery,
  listQuerySchema,
  type UpdateUserInput,
  updateUserSchema,
} from '@sryg/types'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../auth/http/jwt-auth.guard'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { CreateUserUseCase } from '../application/create-user.use-case'
import { ListUsersUseCase } from '../application/list-users.use-case'
import { ResetUserPasswordUseCase } from '../application/reset-user-password.use-case'
import { UpdateUserUseCase } from '../application/update-user.use-case'

const idPipe = new ZodValidationPipe(z.uuid())

/** User administration (AUTH-06): Admin only (D1). Every write is audited (BR-11). */
@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly resetPassword: ResetUserPasswordUseCase,
  ) {}

  @Get()
  @RequirePermission('users', 'read')
  list(@Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery) {
    return this.listUsers.execute(query)
  }

  /** Answers the temporary password once; it is not retrievable afterwards. */
  @Post()
  @HttpCode(201)
  @RequirePermission('users', 'write')
  create(@Req() request: AuthenticatedRequest, @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.createUser.execute(request.user, body)
  }

  @Patch(':id')
  @RequirePermission('users', 'write')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    return this.updateUser.execute(request.user, id, body)
  }

  @Post(':id/activate')
  @HttpCode(200)
  @RequirePermission('users', 'write')
  activate(@Req() request: AuthenticatedRequest, @Param('id', idPipe) id: string) {
    return this.updateUser.execute(request.user, id, { isActive: true })
  }

  @Post(':id/deactivate')
  @HttpCode(200)
  @RequirePermission('users', 'write')
  deactivate(@Req() request: AuthenticatedRequest, @Param('id', idPipe) id: string) {
    return this.updateUser.execute(request.user, id, { isActive: false })
  }

  /** Answers the temporary password once and forces a change on the next login (D4, D14). */
  @Post(':id/reset-password')
  @HttpCode(200)
  @RequirePermission('users', 'write')
  reset(@Req() request: AuthenticatedRequest, @Param('id', idPipe) id: string) {
    return this.resetPassword.execute(request.user, id)
  }
}
