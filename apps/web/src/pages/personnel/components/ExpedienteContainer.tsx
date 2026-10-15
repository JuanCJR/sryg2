import { useParams, useSearchParams } from 'react-router'
import { Breadcrumb, type PageKeyItem } from '../../../common/components'
import type { ExpedienteActions, ExpedienteTab, ExpedienteTabId } from '../../../common/types/expediente'
import { useRole } from '../../../common/hooks/useRole'
import { PATHS } from '../../../routes'
import { DetailPageTemplate } from '../../../common/components/DetailPageTemplate/DetailPageTemplate'
import { ErrorTemplate } from '../../../common/components/ErrorTemplate/ErrorTemplate'
import { ApiError } from '../../../common/services/fetch-json'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { getPersonnel } from '../services/personnel-client'
import { formatDateTime } from '../utils/format'
import { toPersonView } from '../utils/person-view'
import { ExpedienteHeaderSkeleton } from './ExpedienteHeaderSkeleton'
import { IdentityHeader } from './IdentityHeader'

const ID_PREFIX = 'expediente'

export interface ExpedienteContainerProps {
  /** Page keys, each owned by its feature (`src/expediente-registry.ts`). */
  tabs: ExpedienteTab[]
  /** Header action slots, one per feature. */
  actions: ExpedienteActions[]
}

/**
 * Expediente — composes `GET /api/personnel/:id` with the tabs and header actions each feature
 * contributes. It owns only the frame: loading/error/404, the identity header, and the active page
 * key (`?pagina=`). The warning stack (and the page-key lamps) return when the credential modules expose
 * data: an empty stack would read as "sin alertas", which nobody has checked yet.
 */
export function ExpedienteContainer({ tabs, actions }: ExpedienteContainerProps) {
  const { id = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = useRole()
  const resource = useApiResource(`personnel:${id}`, () => getPersonnel(id))

  if (resource.status === 'loading') {
    return (
      <DetailPageTemplate
        status="loading"
        loadingLabel="Cargando expediente"
        headerSkeleton={<ExpedienteHeaderSkeleton />}
        tabCount={tabs.length}
      />
    )
  }

  if (resource.status === 'error') {
    // 400 is a malformed id: for the user it is the same "no such person".
    if (resource.error instanceof ApiError && [400, 404].includes(resource.error.status)) {
      return (
        <ErrorTemplate
          code="404"
          title="Persona no encontrada"
          explanation="No existe un expediente con ese identificador."
        />
      )
    }
    return (
      <DetailPageTemplate
        status="error"
        error={{
          title: 'No se pudo cargar el expediente',
          message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
          onRetry: resource.retry,
        }}
      />
    )
  }

  const dto = resource.data
  const person = toPersonView(dto)
  const visibleTabs = tabs.filter((tab) => !tab.permission || can(tab.permission.module, tab.permission.action))
  // ?pagina= is user input: accept it only if it names a page key this user can see.
  const requested = searchParams.get('pagina')
  const active = visibleTabs.find((tab) => tab.id === requested) ?? visibleTabs[0]
  const hasHistorial = visibleTabs.some((tab) => tab.id === 'historial')

  const selectPage = (pageId: ExpedienteTabId) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('pagina', pageId)
        return next
      },
      { replace: true },
    )

  const pageKeyItems: PageKeyItem[] = visibleTabs.map((tab) => ({ id: tab.id, label: tab.label }))
  const ActiveTab = active?.Component

  return (
    <DetailPageTemplate
      status="ready"
      breadcrumb={<Breadcrumb items={[{ label: 'Personal', href: PATHS.personnel }, { label: person.cedula }]} />}
      header={
        <IdentityHeader
          person={person}
          auditText="Última modificación:"
          auditFigure={formatDateTime(dto.updatedAt)}
          onAuditClick={hasHistorial ? () => selectPage('historial') : undefined}
          actions={actions.map((Actions, index) => (
            <Actions key={index} person={dto} />
          ))}
        />
      }
      tabs={{
        idPrefix: ID_PREFIX,
        ariaLabel: 'Páginas del expediente',
        items: pageKeyItems,
        activeId: active?.id ?? '',
        onChange: (pageId) => selectPage(pageId as ExpedienteTabId),
      }}
    >
      {ActiveTab ? <ActiveTab person={dto} /> : null}
    </DetailPageTemplate>
  )
}
