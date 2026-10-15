import { Controller, Get, Param, Query } from '@nestjs/common'
import { type CatalogOptionsQuery, catalogOptionsQuerySchema } from '@sryg/types'
import { RequirePermission } from '../../common/decorators/require-permission.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { ListCatalogOptionsService } from '../services/list-catalog-options.service'

/** Read-only options for selectors (D19). The maintenance CRUD belongs to W1-11. */
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly listOptions: ListCatalogOptionsService) {}

  @Get(':catalog/options')
  @RequirePermission('catalogs', 'read')
  options(
    @Param('catalog') catalog: string,
    @Query(new ZodValidationPipe(catalogOptionsQuerySchema)) query: CatalogOptionsQuery,
  ) {
    return this.listOptions.execute(catalog, query)
  }
}
