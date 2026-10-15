import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common'
import {
  type CatalogListQuery,
  catalogItemCreateSchemaFor,
  catalogItemUpdateSchemaFor,
  catalogListQuerySchema,
} from '@sryg/types'
import { z } from 'zod'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import type { AuthenticatedRequest } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { toCatalogSlug } from '../services/catalog-slug'
import { CreateCatalogItemService } from '../services/create-catalog-item.service'
import { DeleteCatalogItemService } from '../services/delete-catalog-item.service'
import { ListCatalogItemsService } from '../services/list-catalog-items.service'
import { UpdateCatalogItemService } from '../services/update-catalog-item.service'

const idPipe = new ZodValidationPipe(z.uuid())

/**
 * Maintenance of the D19 catalogs (W1-11): everybody reads, only the Admin writes. Items in use
 * are deactivated, never deleted. The body schema depends on the catalog, so an unknown catalog
 * answers 404 before the body is validated (400).
 */
@Controller('catalogs')
export class CatalogItemsController {
  constructor(
    private readonly listItems: ListCatalogItemsService,
    private readonly createItem: CreateCatalogItemService,
    private readonly updateItem: UpdateCatalogItemService,
    private readonly deleteItem: DeleteCatalogItemService,
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
