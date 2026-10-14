import { Breadcrumb } from '../../../design-system'
import { ListPageTemplate } from '../../../app/templates/ListPageTemplate'
import { CatalogIndexList } from '../components/CatalogIndexList'

/** Index of the D19 catalogs, like SLYM's maintenance menu. The list is static: no request. */
export function CatalogIndexContainer() {
  return (
    <ListPageTemplate
      title="Catálogos"
      breadcrumb={<Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Catálogos' }]} />}
      summary={<p>Valores que ofrecen los formularios, en español y en inglés para la credencial bilingüe.</p>}
      status="ready"
    >
      <CatalogIndexList />
    </ListPageTemplate>
  )
}
