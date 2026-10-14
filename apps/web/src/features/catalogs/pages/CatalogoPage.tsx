import { useParams } from 'react-router'
import { PendingScreen } from '../../../app/templates/PendingScreen'

/** Placeholder pre-registered by F0-B; W1-11 feat/catalogs replaces it. */
export function CatalogoPage() {
  const { catalogo } = useParams()
  return <PendingScreen title={`Catálogo ${catalogo ?? ''}`.trim()} plannedChange="W1-11 feat/catalogs" />
}
