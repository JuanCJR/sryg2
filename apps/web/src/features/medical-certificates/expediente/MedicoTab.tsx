import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { MedicalCertificateDto } from '@sryg/types'
import { Button } from '../../../design-system'
import type { ConditionRow } from '../../../app/expediente/ConditionTable'
import type { ExpedienteSlotProps } from '../../../app/expediente/types'
import { useRole } from '../../../app/role/useRole'
import { medicalForm } from '../../../app/routes'
import { useApiResource } from '../../../shared/api/useApiResource'
import { CertificateHistory } from '../components/CertificateHistory'
import { MedicoPanel, type MedicoPanelState } from '../components/MedicoPanel'
import { getCertificateHistory, listPersonCertificates } from '../data/medical-certificates-client'
import { daysUntil, formatDay, formatRemaining, localToday } from '../domain/dates'
import { certificateName, STATUS_TO_BADGE } from '../domain/labels'
import styles from '../components/MedicoPanel.module.css'

function toRow(certificate: MedicalCertificateDto, today: string): ConditionRow {
  const notes = [...certificate.observations.map((o) => o.nameEs), certificate.restrictions].filter(Boolean)
  return {
    id: certificate.id,
    status: STATUS_TO_BADGE[certificate.status],
    nombre: certificateName(certificate),
    emitidaLabel: formatDay(certificate.issueDate),
    venceLabel: formatDay(certificate.expiryDate),
    restanteLabel: formatRemaining(daysUntil(certificate.expiryDate, today)),
    restriccionLabel: notes.length ? notes.join(' · ') : '—',
  }
}

function HistoryOf({ certificateId }: { certificateId: string }) {
  const resource = useApiResource(`medical-history:${certificateId}`, () => getCertificateHistory(certificateId))
  return (
    <CertificateHistory
      state={resource.status === 'ready' ? { status: 'ready', entries: resource.data } : { status: resource.status }}
    />
  )
}

/** One toggle per certificate; the open one loads its audit rows (MED-07). */
function HistorySection({ certificates }: { certificates: MedicalCertificateDto[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  if (certificates.length === 0) return null
  return (
    <div className={styles.history}>
      <div className={styles.historyToggles}>
        {certificates.map((c) => (
          <Button
            key={c.id}
            variant="ghost"
            size="sm"
            aria-expanded={openId === c.id}
            onClick={() => setOpenId((current) => (current === c.id ? null : c.id))}
          >
            Historial · {certificateName(c)}
          </Button>
        ))}
      </div>
      {openId ? <HistoryOf certificateId={openId} /> : null}
    </div>
  )
}

/** Médico page key (RAV 67, administrative data only: BR-05, D8). */
export function MedicoTab({ person }: ExpedienteSlotProps) {
  const { can } = useRole()
  const navigate = useNavigate()
  const resource = useApiResource(`medical-certificates:${person.id}`, () => listPersonCertificates(person.id))

  let state: MedicoPanelState
  if (resource.status === 'loading') state = { status: 'loading' }
  else if (resource.status === 'error') state = { status: 'error', onRetry: resource.retry }
  else {
    const today = localToday()
    state = {
      status: 'ready',
      rows: resource.data.items.map((c) => toRow(c, today)),
      thresholdDays: resource.data.alertThresholdDays.value,
      thresholdIsPlaceholder: resource.data.alertThresholdDays.isPlaceholder,
      hasActiveBlock: resource.data.hasActiveBlock,
      history: can('audit', 'read') ? <HistorySection certificates={resource.data.items} /> : undefined,
    }
  }

  return (
    <MedicoPanel
      state={state}
      canWriteMedical={can('medical_certificates', 'write')}
      onRegisterOrRenew={() => navigate(medicalForm(person.id))}
    />
  )
}
