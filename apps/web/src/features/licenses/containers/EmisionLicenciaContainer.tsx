import { useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Breadcrumb, Button, Notice, useToast } from '../../../design-system'
import { useDemoToday } from '../../../demo/clock'
import { useDemoStateOverride } from '../../../demo/useDemoStateOverride'
import { useDemoResource } from '../../../demo/useDemoResource'
import { addDays } from '../../../demo/seed'
import { FormPageTemplate } from '../../../app/templates/FormPageTemplate'
import { FormSection } from '../../../app/templates/FormSection'
import { ErrorTemplate } from '../../../app/templates/ErrorTemplate'
import { personnelDetail } from '../../../app/routes'
import { buildLicenseFormData } from '../data/demoData'
import { DEMO_LICENSE_VALIDITY_DAYS } from '../domain/config'
import { formatDate } from '../domain/format'
import { LicenseSubjectStrip } from '../components/LicenseSubjectStrip'
import { LicenseSection } from '../components/LicenseSection'
import { RatingsSection } from '../components/RatingsSection'
import { LicenseSummaryRail, type LicenseSummaryItem } from '../components/LicenseSummaryRail'

type SubmitPhase = 'editing' | 'submitting'

function toDateValue(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * Emisión/renovación de licencia — the Form direction's reference page ("Sectioned form with
 * fixed summary rail"). The block check runs as soon as the page opens (not at submit): an open
 * block replaces the whole form with the `blocked` status. One trámite issues or renews the
 * license together with whichever ratings the operator includes.
 */
export function EmisionLicenciaContainer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const today = useDemoToday()
  const estadoOverride = useDemoStateOverride(['cargando', 'error', 'bloqueado'] as const)

  const resource = useDemoResource(`license-form-${id ?? ''}`, () => buildLicenseFormData(id ?? '', today), {
    forceLoading: estadoOverride === 'cargando',
    forceError: estadoOverride === 'error',
  })

  const [phase, setPhase] = useState<SubmitPhase>('editing')
  const [excludedRatingIds, setExcludedRatingIds] = useState<Set<string>>(new Set())
  const [dateOverrides, setDateOverrides] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showErrorSummary, setShowErrorSummary] = useState(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const defaultNewDate = toDateValue(addDays(today, DEMO_LICENSE_VALIDITY_DAYS))

  // Computed once, before any early return, so the breadcrumb's person segment (the route id,
  // refined to the cédula once resolved) and the identity-strip slot stay identical in shape
  // across loading, error, blocked, and ready — nothing reflows when the trámite resolves.
  const resolvedData = resource.status === 'ready' ? resource.data : undefined
  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: 'Inicio', href: '/' },
        { label: 'Personal', href: '/personal' },
        resolvedData
          ? { label: resolvedData.person.cedula, href: personnelDetail(resolvedData.person.id) }
          : { label: id ?? '—', href: id ? personnelDetail(id) : undefined },
        { label: 'Emisión' },
      ]}
    />
  )

  if (resource.status === 'loading') {
    return (
      <FormPageTemplate
        status="loading"
        title="Emitir o renovar licencia"
        breadcrumb={breadcrumb}
        subject={<LicenseSubjectStrip loading />}
        loadingLabel="Cargando trámite"
      />
    )
  }

  if (resource.status === 'error') {
    return (
      <FormPageTemplate
        status="error"
        title="Emitir o renovar licencia"
        breadcrumb={breadcrumb}
        subject={<LicenseSubjectStrip loading />}
        error={{
          title: 'No se pudo cargar el trámite',
          message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
          onRetry: resource.retry,
        }}
      />
    )
  }

  const data = resolvedData
  if (!data) {
    return (
      <ErrorTemplate
        code="404"
        title="Persona no encontrada"
        explanation="No existe un expediente sintético con esa cédula o identificador en esta demostración."
      />
    )
  }

  const isBlocked = Boolean(data.block) || estadoOverride === 'bloqueado'

  if (isBlocked) {
    const block =
      data.block ??
      ({
        id: 'B-DEMO',
        motivo: 'Bloqueo administrativo abierto (demostración).',
        registradoEn: today.toISOString(),
      } as const)
    return (
      <FormPageTemplate
        status="blocked"
        title="Emitir o renovar licencia"
        breadcrumb={breadcrumb}
        subject={
          <LicenseSubjectStrip cedula={data.person.cedula} nombre={data.person.nombre} overallStatus="bloqueada" />
        }
        blocked={{
          title: `Bloqueo ${block.id} abierto · emisión impedida`,
          reason: `${block.motivo} Resuelva el bloqueo desde el expediente antes de continuar.`,
          action: (
            <Button variant="primary" onClick={() => navigate(personnelDetail(data.person.id))}>
              Volver al expediente
            </Button>
          ),
        }}
      />
    )
  }

  const includedRatings = data.ratings.filter((r) => !excludedRatingIds.has(r.id))
  const emitLabel =
    includedRatings.length === 0
      ? 'Emitir licencia'
      : `Emitir licencia + ${includedRatings.length} ${includedRatings.length === 1 ? 'habilitación' : 'habilitaciones'}`

  const licenseDate = dateOverrides[data.license.id] ?? defaultNewDate
  const summaryItems: LicenseSummaryItem[] = [
    { id: data.license.id, label: `Licencia — ${data.license.categoria}`, nuevaFechaLabel: formatDate(licenseDate) },
    ...includedRatings.map((r) => ({
      id: r.id,
      label: `Habilitación — ${r.nombre}`,
      nuevaFechaLabel: formatDate(dateOverrides[r.id] ?? defaultNewDate),
    })),
  ]

  const handleToggleRating = (ratingId: string) => {
    setExcludedRatingIds((current) => {
      const next = new Set(current)
      if (next.has(ratingId)) {
        next.delete(ratingId)
      } else {
        next.add(ratingId)
      }
      return next
    })
  }

  const handleDateChange = (itemId: string, value: string) => {
    setDateOverrides((current) => ({ ...current, [itemId]: value }))
    setFieldErrors((current) => {
      if (!current[itemId]) {
        return current
      }
      const next = { ...current }
      delete next[itemId]
      return next
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors: Record<string, string> = {}
    if (!licenseDate) {
      errors[data.license.id] = 'Ingrese la nueva fecha de vencimiento.'
    }
    for (const rating of includedRatings) {
      const value = dateOverrides[rating.id] ?? defaultNewDate
      if (!value) {
        errors[rating.id] = 'Ingrese la nueva fecha de vencimiento.'
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setShowErrorSummary(true)
      requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return
    }
    setShowErrorSummary(false)
    setPhase('submitting')
    setTimeout(() => {
      toast.show({ tone: 'info', message: `Trámite emitido (demostración): ${emitLabel}.` })
      navigate(personnelDetail(data.person.id))
    }, 600)
  }

  const ratingRows = data.ratings.map((rating) => ({
    id: rating.id,
    nombre: rating.nombre,
    estadoActual: rating.estadoActual,
    venceActualLabel: formatDate(rating.venceActual),
    included: !excludedRatingIds.has(rating.id),
    nuevaFecha: dateOverrides[rating.id] ?? defaultNewDate,
    nuevaFechaError: fieldErrors[rating.id],
  }))

  return (
    <FormPageTemplate
      status={phase}
      title="Emitir o renovar licencia"
      breadcrumb={breadcrumb}
      subject={
        <LicenseSubjectStrip
          cedula={data.person.cedula}
          nombre={data.person.nombre}
          overallStatus={data.license.estadoActual}
        />
      }
      onSubmit={handleSubmit}
      errorSummary={
        showErrorSummary ? (
          <div ref={errorSummaryRef} tabIndex={-1}>
            <Notice tone="warning" title="Revise los campos marcados">
              Complete la nueva fecha de vencimiento antes de continuar.
            </Notice>
          </div>
        ) : undefined
      }
      rail={<LicenseSummaryRail items={summaryItems} />}
      actions={
        <>
          <Button type="submit" variant="primary" loading={phase === 'submitting'}>
            {emitLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={phase === 'submitting'}
            onClick={() => navigate(personnelDetail(data.person.id))}
          >
            Cancelar
          </Button>
        </>
      }
    >
      <FormSection legend="Licencia">
        <LicenseSection
          categoria={data.license.categoria}
          numero={data.license.numero}
          estadoActual={data.license.estadoActual}
          venceActualLabel={formatDate(data.license.venceActual)}
          nuevaFecha={licenseDate}
          onNuevaFechaChange={(value) => handleDateChange(data.license.id, value)}
          nuevaFechaError={fieldErrors[data.license.id]}
        />
      </FormSection>
      <FormSection
        legend="Habilitaciones"
        description="Incluya las habilitaciones que también desea renovar en este trámite."
      >
        <RatingsSection rows={ratingRows} onToggle={handleToggleRating} onDateChange={handleDateChange} />
      </FormSection>
    </FormPageTemplate>
  )
}
