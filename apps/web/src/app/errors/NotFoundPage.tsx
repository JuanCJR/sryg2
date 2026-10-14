import { ErrorTemplate } from '../templates/ErrorTemplate'

export function NotFoundPage() {
  return (
    <ErrorTemplate code="404" title="Página no encontrada" explanation="La dirección solicitada no existe en SRYG." />
  )
}
