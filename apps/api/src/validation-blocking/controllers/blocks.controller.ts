import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common'
import {
  type CreateBlockInput,
  createBlockSchema,
  type ListBlocksQuery,
  listBlocksQuerySchema,
  type ResolveBlockInput,
  resolveBlockSchema,
} from '@sryg/types'
import { z } from 'zod'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { GetBlockService } from '../services/get-block.service'
import { ListBlocksService } from '../services/list-blocks.service'
import { RegisterBlockService } from '../services/register-block.service'
import { ResolveBlockService } from '../services/resolve-block.service'

const idPipe = new ZodValidationPipe(z.uuid())

/** Every role reads; the Admin and Supervisors of any area register and resolve (D2, D24). */
@Controller('blocks')
export class BlocksController {
  constructor(
    private readonly registerBlock: RegisterBlockService,
    private readonly resolveBlock: ResolveBlockService,
    private readonly getBlock: GetBlockService,
    private readonly listBlocks: ListBlocksService,
  ) {}

  @Get()
  @RequirePermission('blocking', 'read')
  list(@Query(new ZodValidationPipe(listBlocksQuerySchema)) query: ListBlocksQuery) {
    return this.listBlocks.execute(query)
  }

  @Get(':id')
  @RequirePermission('blocking', 'read')
  get(@Param('id', idPipe) id: string) {
    return this.getBlock.execute(id)
  }

  @Post()
  @HttpCode(201)
  @RequirePermission('blocking', 'write')
  register(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createBlockSchema)) body: CreateBlockInput,
  ) {
    return this.registerBlock.execute(request.user, body)
  }

  @Post(':id/resolve')
  @HttpCode(200)
  @RequirePermission('blocking', 'write')
  resolve(
    @Req() request: AuthenticatedRequest,
    @Param('id', idPipe) id: string,
    @Body(new ZodValidationPipe(resolveBlockSchema)) body: ResolveBlockInput,
  ) {
    return this.resolveBlock.execute(request.user, id, body)
  }
}
