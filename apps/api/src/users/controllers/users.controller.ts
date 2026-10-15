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
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { CreateUserService } from '../services/create-user.service'
import { ListUsersService } from '../services/list-users.service'
import { ResetUserPasswordService } from '../services/reset-user-password.service'
import { UpdateUserService } from '../services/update-user.service'

const idPipe = new ZodValidationPipe(z.uuid())

/** User administration (AUTH-06): Admin only (D1). Every write is audited (BR-11). */
@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsers: ListUsersService,
    private readonly createUser: CreateUserService,
    private readonly updateUser: UpdateUserService,
    private readonly resetPassword: ResetUserPasswordService,
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
