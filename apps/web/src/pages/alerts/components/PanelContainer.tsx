import { useState } from 'react'
import { Link } from 'react-router'
import type { Alert } from '@sryg/types'
import { DashboardPanel, DashboardTemplate, Pagination, useToast } from '../../../common/components'
import { PATHS } from '../../../routes'
import { useRole } from '../../../common/hooks/useRole'
import { ApiError } from '../../../common/services/fetch-json'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { AccessLogPanel } from './AccessLogPanel'
import { AlertFilters } from './AlertFilters'
import { AlertList } from './AlertList'
import { AlertsAnnunciator } from './AlertsAnnunciator'
import { acknowledgeAlert, getAccessLog } from '../services/alerts-client'
import { isDefaultView } from '../utils/alert-view'
import { ALERTS_PAGE_SIZES, useAlertsPanel } from '../hooks/useAlertsPanel'
import styles from './PanelContainer.module.css'

const LOAD_ERROR = {
  title: 'No se pudieron cargar las alertas',
  message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
}

/**
 * /panel (ALR-03, D23) on `GET /api/alerts`, `GET /api/alerts/summary` and
 * `GET /api/auth/me/access-log`. Every role reads alerts (D1); the list starts on the user's own
 * area and can switch to the other, which they read (D24). Acknowledging (ALR-06) follows the API:
 * it only needs `alerts:read`, since the matrix defines no write on alerts.
 */
export function PanelContainer() {
  const { user, area, can } = useRole()
  const toast = useToast()
  const {
    filters,
    setFilter,
    clearFilters,
    toggleKind,
    page,
    setPage,
    pageSize,
    setPageSize,
    alerts,
    summary,
    reload,
  } = useAlertsPanel(area)
  const log = useApiResource(user ? `access-log:${user.id}` : null, getAccessLog)
  const [pendingId, setPendingId] = useState<string | null>(null)
  // Computed once per render: the "vence en N días" text of every row uses the same day.
  const today = new Date()

  const handleAcknowledge = async (alert: Alert) => {
    setPendingId(alert.id)
    try {
      await acknowledgeAlert(alert.id)
      toast.show({ tone: 'info', message: 'Alerta reconocida.' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.show({ tone: 'warning', message: 'Otra persona ya había reconocido esta alerta.' })
      } else if (error instanceof ApiError && error.status === 404) {
        toast.show({ tone: 'warning', message: 'La alerta ya no existe: la credencial se renovó o cambió.' })
      } else {
        toast.show({ tone: 'error', message: 'No se pudo reconocer la alerta. Intente de nuevo.' })
        return
      }
    } finally {
      setPendingId(null)
    }
    reload()
  }

  const counts = summary.status === 'ready' ? summary.data.byKind : null
  const common = {
    title: 'Panel',
    mainLabel: 'Alertas de vencimiento',
    primaryAction: can('reports', 'read') ? (
      <Link to={PATHS.reports} className={styles.reportsLink}>
        Ver reportes
      </Link>
    ) : undefined,
    filters: <AlertFilters values={filters} onChange={setFilter} onClearAll={clearFilters} />,
    summary: <AlertsAnnunciator counts={counts} selected={filters.kind} onToggle={toggleKind} />,
    panels: (
      <DashboardPanel title="Registro de accesos">
        <AccessLogPanel log={log} />
      </DashboardPanel>
    ),
  }

  if (alerts.status === 'loading') {
    return <DashboardTemplate {...common} status="loading" loadingLabel="Cargando alertas" />
  }
  if (alerts.status === 'error') {
    return <DashboardTemplate {...common} status="error" error={{ ...LOAD_ERROR, onRetry: alerts.retry }} />
  }

  const { items, total } = alerts.data
  if (total === 0) {
    const filtered = !isDefaultView(filters, area)
    return (
      <DashboardTemplate
        {...common}
        status="empty"
        empty={
          filtered
            ? {
                reason: 'no-results',
                title: 'Sin alertas para estos filtros',
                message: 'Ninguna alerta coincide con los filtros elegidos.',
              }
            : {
                reason: 'no-data',
                title: 'Sin alertas pendientes',
                message: 'No hay credenciales vencidas ni próximas a vencer sin reconocer.',
              }
        }
      />
    )
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return (
    <DashboardTemplate
      {...common}
      status="ready"
      pagination={
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          total={total}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={ALERTS_PAGE_SIZES}
        />
      }
    >
      <AlertList
        alerts={items}
        today={today}
        onAcknowledge={can('alerts', 'read') ? handleAcknowledge : undefined}
        pendingId={pendingId}
      />
    </DashboardTemplate>
  )
}
