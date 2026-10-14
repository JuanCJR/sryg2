import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common'
import {
  type CatalogListQuery,
  catalogItemCreateSchemaFor,
  catalogItemUpdateSchemaFor,
  catalogListQuerySchema,
} from '@sryg/types'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../auth/http/jwt-auth.guard'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { toCatalogSlug } from '../application/catalog-slug'
import { CreateCatalogItemUseCase } from '../application/create-catalog-item.use-case'
import { DeleteCatalogItemUseCase } from '../application/delete-catalog-item.use-case'
import { ListCatalogItemsUseCase } from '../application/list-catalog-items.use-case'
import { UpdateCatalogItemUseCase } from '../application/update-catalog-item.use-case'

const idPipe = new ZodValidationPipe(z.uuid())

/**
 * Maintenance of the D19 catalogs (W1-11): everybody reads, only the Admin writes. Items in use
 * are deactivated, never deleted. The body schema depends on the catalog, so an unknown catalog
 * answers 404 before the body is validated (400).
 */
@Controller('catalogs')
export class CatalogItemsController {
  constructor(
    private readonly listItems: ListCatalogItemsUseCase,
    private readonly createItem: CreateCatalogItemUseCase,
    private readonly updateItem: UpdateCatalogItemUseCase,
    private readonly deleteItem: DeleteCatalogItemUseCase,
  ) {}

  @Get(':catalog')
  @RequirePermission('catalogs', 'read')
  list(
    @Param('catalog') catalog: string,
    @Query(new ZodValidationPipe(catalogListQuerySchema)) query: CatalogListQuery,
  ) {
    return this.listItems.execute(toCatalogSlug(catalog), query)
  }

  @Post(':catalog')
  @HttpCode(201)
  @RequirePermission('catalogs', 'write')
  create(@Req() request: AuthenticatedRequest, @Param('catalog') catalog: string, @Body() body: unknown) {
    const slug = toCatalogSlug(catalog)
    return this.createItem.execute(
      request.user,
      slug,
      new ZodValidationPipe(catalogItemCreateSchemaFor(slug)).transform(body),
    )
  }

  @Patch(':catalog/:id')
  @RequirePermission('catalogs', 'write')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('catalog') catalog: string,
    @Param('id', idPipe) id: string,
    @Body() body: unknown,
  ) {
    const slug = toCatalogSlug(catalog)
    const input = new ZodValidationPipe(catalogItemUpdateSchemaFor(slug)).transform(body)
    return this.updateItem.execute(request.user, slug, id, input)
  }

  @Delete(':catalog/:id')
  @HttpCode(204)
  @RequirePermission('catalogs', 'write')
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('catalog') catalog: string,
    @Param('id', idPipe) id: string,
  ) {
    await this.deleteItem.execute(request.user, toCatalogSlug(catalog), id)
  }
}
