import { Controller, Get, Param, Query } from '@nestjs/common'
import { type CatalogOptionsQuery, catalogOptionsQuerySchema } from '@sryg/types'
import { RequirePermission } from '../../shared/http/require-permission.decorator'
import { ZodValidationPipe } from '../../shared/http/zod-validation.pipe'
import { ListCatalogOptionsUseCase } from '../application/list-catalog-options.use-case'

/** Read-only options for selectors (D19). The maintenance CRUD belongs to W1-11. */
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly listOptions: ListCatalogOptionsUseCase) {}

  @Get(':catalog/options')
  @RequirePermission('catalogs', 'read')
  options(
    @Param('catalog') catalog: string,
    @Query(new ZodValidationPipe(catalogOptionsQuerySchema)) query: CatalogOptionsQuery,
  ) {
    return this.listOptions.execute(catalog, query)
  }
}
