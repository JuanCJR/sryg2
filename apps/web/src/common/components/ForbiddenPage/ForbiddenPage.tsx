import { ErrorTemplate } from '../ErrorTemplate/ErrorTemplate'

export function ForbiddenPage() {
  return (
    <ErrorTemplate
      code="403"
      title="Acceso restringido"
      explanation="Su rol o su área no tienen permiso para ver esta pantalla."
    />
  )
}
