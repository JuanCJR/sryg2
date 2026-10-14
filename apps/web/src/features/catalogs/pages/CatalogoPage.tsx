import { useParams } from 'react-router'
import { NotFoundPage } from '../../../app/errors/NotFoundPage'
import { CatalogContainer } from '../containers/CatalogContainer'
import { isCatalogSlug } from '../domain/catalog-meta'

/** Thin route entry for `/catalogos/:catalogo`; an unknown catalog is a 404. */
export function CatalogoPage() {
  const { catalogo } = useParams()
  if (!isCatalogSlug(catalogo)) return <NotFoundPage />
  // Keyed by catalog: moving between catalogs starts with a clean search and page.
  return <CatalogContainer key={catalogo} catalog={catalogo} />
}
