import { useState } from 'react'
import { History, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import type { LicenseDto } from '@sryg/types'
import { Button, Icon, Notice } from '../../../common/components'
import type { ExpedienteSlotProps } from '../../../common/types/expediente'
import { useRole } from '../../../common/hooks/useRole'
import { licenseForm } from '../../../routes'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { LicenciasPanel, type LicenseDetailView } from './LicenciasPanel'
import { LicenseHistoryList } from './LicenseHistoryList'
import { getLicenseHistory, getPersonLicenses } from '../services/licenses-client'
import { formatDateTime, todayIso } from '../utils/format'
import { classRatingRow, historyLine, licenseRow, typeRatingRow } from '../utils/license-view'
import styles from './LicenciasTab.module.css'

function toDetail(license: LicenseDto, today: string): LicenseDetailView {
  return {
    id: license.id,
    title: `${license.licenseType.nameEs} · N° ${license.number}`,
    row: licenseRow(license, today),
    observations: license.observations.map((o) => o.nameEs),
    typeRatings: license.typeRatings.map((r) => typeRatingRow(r, today)),
    classRatings: license.classRatings.map((r) => classRatingRow(r, today)),
  }
}

/** History of one license, loaded when the operator opens it (audit read only, D1). */
function LicenseHistory({ licenseId }: { licenseId: string }) {
  const resource = useApiResource(`license-history:${licenseId}`, () => getLicenseHistory(licenseId))
  if (resource.status === 'loading') return <LicenseHistoryList status="loading" />
  if (resource.status === 'error') return <LicenseHistoryList status="error" onRetry={resource.retry} />
  return (
    <LicenseHistoryList
      status="ready"
      lines={resource.data.map(historyLine).map((l) => ({ id: l.id, what: l.what, whenLabel: formatDateTime(l.when) }))}
    />
  )
}

/** Licencias page key: the person's licenses with their type and class ratings and observations (D20). */
export function LicenciasTab({ person }: ExpedienteSlotProps) {
  const { can } = useRole()
  const [openHistory, setOpenHistory] = useState<Set<string>>(new Set())
  const resource = useApiResource(`person-licenses:${person.id}`, () => getPersonLicenses(person.id))

  if (resource.status === 'loading') {
    return (
      <p role="status" className={styles.muted}>
        Cargando licencias…
      </p>
    )
  }
  if (resource.status === 'error') {
    return (
      <Notice
        tone="warning"
        title="No se pudieron cargar las licencias"
        action={
          <Button variant="secondary" size="sm" onClick={resource.retry}>
            Reintentar
          </Button>
        }
      >
        El servidor no respondió. Revise la conexión a la red local e intente de nuevo.
      </Notice>
    )
  }
  if (resource.data.length === 0) {
    return <p className={styles.muted}>La persona no tiene licencias registradas.</p>
  }

  const today = todayIso()
  const canRenew = can('licenses', 'write')
  const canReadHistory = can('audit', 'read')
  const toggleHistory = (id: string) =>
    setOpenHistory((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <LicenciasPanel
      licenses={resource.data.map((license) => toDetail(license, today))}
      renderActions={(license) => (
        <>
          {canRenew ? (
            <Link
              className={styles.link}
              to={`${licenseForm(person.id)}?licencia=${license.id}`}
              aria-label={`Renovar ${license.row.nombre}`}
            >
              <Icon icon={RefreshCw} size={16} />
              Renovar
            </Link>
          ) : null}
          {canReadHistory ? (
            <Button
              variant="ghost"
              size="sm"
              icon={History}
              aria-expanded={openHistory.has(license.id)}
              onClick={() => toggleHistory(license.id)}
            >
              {openHistory.has(license.id) ? 'Ocultar historial' : 'Ver historial'}
            </Button>
          ) : null}
        </>
      )}
      renderHistory={(license) => (openHistory.has(license.id) ? <LicenseHistory licenseId={license.id} /> : null)}
    />
  )
}
