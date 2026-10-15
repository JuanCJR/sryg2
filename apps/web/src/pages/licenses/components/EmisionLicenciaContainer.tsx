import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { PENDING_INAC_LABEL, type LicenseDto, type PersonnelDto } from '@sryg/types'
import { Breadcrumb, Button, Notice, useToast, worstStatus } from '../../../common/components'
import { FormPageTemplate } from '../../../common/components/FormPageTemplate/FormPageTemplate'
import { FormSection } from '../../../common/components/FormSection/FormSection'
import { ErrorTemplate } from '../../../common/components/ErrorTemplate/ErrorTemplate'
import { PATHS, personnelDetail } from '../../../routes'
import { ApiError } from '../../../common/services/fetch-json'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { checkLicense, getPerson, getPersonLicenses, issueLicense, renewLicense } from '../services/licenses-client'
import {
  existingAction,
  initialDraft,
  issueBody,
  renewBody,
  submitLabel,
  summarize,
  validateDraft,
  type EmissionDraft,
  type EmissionErrors,
  type ExistingRatingAction,
  type NewClassRatingDraft,
  type NewTypeRatingDraft,
} from '../utils/emission'
import { formatDate, formatExpiry, todayIso } from '../utils/format'
import { classRatingLabel, typeRatingLabel } from '../utils/license-view'
import { toCredentialStatus } from '../utils/status'
import { LicenseSubjectStrip } from './LicenseSubjectStrip'
import { LicenseSection } from './LicenseSection'
import { ObservationsSection } from './ObservationsSection'
import { RatingsSection, type RatingRowView } from './RatingsSection'
import { NewClassRatingsEditor, NewTypeRatingsEditor } from './NewRatingsEditor'
import { TramiteSection } from './TramiteSection'
import { LicenseSummaryRail } from './LicenseSummaryRail'

const TITLE = 'Emitir o renovar licencia'
const NEW_LICENSE = 'nueva'

const fullName = (person: PersonnelDto) => `${person.firstNames} ${person.lastNames}`.trim()

function breadcrumbFor(id: string, person?: PersonnelDto) {
  return (
    <Breadcrumb
      items={[
        { label: 'Inicio', href: PATHS.panel },
        { label: 'Personal', href: PATHS.personnel },
        { label: person?.cedula ?? id, href: personnelDetail(id) },
        { label: 'Emisión' },
      ]}
    />
  )
}

/**
 * Emisión/renovación de licencia — the Form direction's reference page ("Sectioned form with
 * fixed summary rail"), on the licenses API. The block check runs as soon as the page opens (not
 * at submit): an open block replaces the whole form with the `blocked` status (BR-07). A 409 at
 * submit (a block registered meanwhile, or the D13 coherence) lands in the same state. One
 * trámite issues or renews the license together with its observations and rating changes.
 */
export function EmisionLicenciaContainer() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const resource = useApiResource(`license-form:${id}`, async () => {
    const [person, licenses, check] = await Promise.all([
      getPerson(id),
      getPersonLicenses(id),
      checkLicense({ personalId: id }),
    ])
    return { person, licenses, check }
  })

  if (resource.status === 'loading') {
    return (
      <FormPageTemplate
        status="loading"
        title={TITLE}
        breadcrumb={breadcrumbFor(id)}
        subject={<LicenseSubjectStrip loading />}
        loadingLabel="Cargando trámite"
      />
    )
  }

  if (resource.status === 'error') {
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
      <FormPageTemplate
        status="error"
        title={TITLE}
        breadcrumb={breadcrumbFor(id)}
        subject={<LicenseSubjectStrip loading />}
        error={{
          title: 'No se pudo cargar el trámite',
          message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
          onRetry: resource.retry,
        }}
      />
    )
  }

  const { person, licenses, check } = resource.data
  const backToExpediente = (
    <Button variant="primary" onClick={() => navigate(personnelDetail(person.id))}>
      Volver al expediente
    </Button>
  )

  if (check.blocked) {
    return (
      <FormPageTemplate
        status="blocked"
        title={TITLE}
        breadcrumb={breadcrumbFor(id, person)}
        subject={<LicenseSubjectStrip cedula={person.cedula} nombre={fullName(person)} overallStatus="bloqueada" />}
        blocked={{
          title: 'Bloqueo activo · Emisión impedida',
          reason: check.problems.join(' '),
          action: backToExpediente,
        }}
      />
    )
  }

  const requested = searchParams.get('licencia')
  const license = licenses.find((l) => l.id === requested) ?? null
  const changeMode = (value: string) =>
    setSearchParams(value === NEW_LICENSE ? {} : { licencia: value }, { replace: true })

  return (
    <EmisionForm
      // A new trámite starts from a clean draft.
      key={license?.id ?? NEW_LICENSE}
      person={person}
      licenses={licenses}
      license={license}
      onModeChange={changeMode}
      backToExpediente={backToExpediente}
    />
  )
}

interface EmisionFormProps {
  person: PersonnelDto
  licenses: LicenseDto[]
  license: LicenseDto | null
  onModeChange: (value: string) => void
  backToExpediente: ReactNode
}

type Phase = 'editing' | 'submitting'

function EmisionForm({ person, licenses, license, onModeChange, backToExpediente }: EmisionFormProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const [today] = useState(todayIso)
  const [draft, setDraft] = useState<EmissionDraft>(() => initialDraft(license, person.cedula, today))
  const [errors, setErrors] = useState<EmissionErrors>({})
  const [showErrorSummary, setShowErrorSummary] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('editing')
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const nextKey = useRef(0)

  const licenseTypeId = draft.license ? undefined : draft.licenseType?.id
  const canCheck = Boolean(draft.license || licenseTypeId) && Boolean(draft.issueDate)
  const projection = useApiResource(
    canCheck ? `license-check:${person.id}:${draft.license?.id ?? licenseTypeId}:${draft.issueDate}` : null,
    () =>
      checkLicense({
        personalId: person.id,
        licenseTypeId,
        licenseId: draft.license?.id,
        issueDate: draft.issueDate,
      }),
  )

  const subject = (
    <LicenseSubjectStrip
      cedula={person.cedula}
      nombre={fullName(person)}
      overallStatus={
        license
          ? toCredentialStatus(license.status)
          : (worstStatus(licenses.map((l) => toCredentialStatus(l.status))) ?? null)
      }
    />
  )
  const breadcrumb = breadcrumbFor(person.id, person)

  if (conflict) {
    return (
      <FormPageTemplate
        status="blocked"
        title={TITLE}
        breadcrumb={breadcrumb}
        subject={subject}
        blocked={{ title: 'Trámite rechazado · Emisión impedida', reason: conflict, action: backToExpediente }}
      />
    )
  }

  const update = (patch: Partial<EmissionDraft>, clear: string[] = []) => {
    setDraft((current) => ({ ...current, ...patch }))
    if (clear.length > 0) {
      setErrors((current) => {
        const next = { ...current }
        for (const key of clear) delete next[key]
        return next
      })
    }
  }

  const setAction = (kind: 'type' | 'class', ratingId: string, action: ExistingRatingAction) => {
    const field = kind === 'type' ? 'typeActions' : 'classActions'
    setDraft((current) => ({ ...current, [field]: { ...current[field], [ratingId]: action } }))
    setErrors((current) => {
      const next = { ...current }
      delete next[`${kind}-${ratingId}`]
      return next
    })
  }

  const ratingRows = (kind: 'type' | 'class'): RatingRowView[] => {
    const source =
      kind === 'type'
        ? (license?.typeRatings ?? []).map((r) => ({ rating: r, nombre: typeRatingLabel(r) }))
        : (license?.classRatings ?? []).map((r) => ({ rating: r, nombre: classRatingLabel(r) }))
    return source.map(({ rating, nombre }) => ({
      id: rating.id,
      nombre,
      estadoActual: toCredentialStatus(rating.status),
      venceActualLabel: formatDate(rating.expiryDate),
      action: existingAction(draft, kind, rating.id),
      nuevaFechaError: errors[`${kind}-${rating.id}`],
    }))
  }

  const toggle = (kind: 'type' | 'class', ratingId: string, target: 'renew' | 'remove') => {
    const current = existingAction(draft, kind, ratingId)
    if (current.kind === target) setAction(kind, ratingId, { kind: 'keep' })
    else setAction(kind, ratingId, target === 'renew' ? { kind: 'renew', expiryDate: '' } : { kind: 'remove' })
  }

  const patchNewType = (key: string, patch: Partial<NewTypeRatingDraft>) => {
    setDraft((current) => ({
      ...current,
      newTypeRatings: current.newTypeRatings.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }))
  }
  const patchNewClass = (key: string, patch: Partial<NewClassRatingDraft>) => {
    setDraft((current) => ({
      ...current,
      newClassRatings: current.newClassRatings.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    }))
  }
  const newKey = (prefix: string) => `${prefix}-${(nextKey.current += 1)}`

  let nuevoVenceLabel = '—'
  if (canCheck && projection.status === 'loading') nuevoVenceLabel = 'Calculando…'
  if (projection.status === 'error') nuevoVenceLabel = 'No disponible'
  if (canCheck && projection.status === 'ready' && projection.data.projection) {
    const { expiryDate, validityIsPlaceholder } = projection.data.projection
    nuevoVenceLabel = formatExpiry(expiryDate)
    if (expiryDate && validityIsPlaceholder) nuevoVenceLabel += ` · ${PENDING_INAC_LABEL}`
  }
  const problems = canCheck && projection.status === 'ready' ? projection.data.problems : []

  const { issued, removed } = summarize(draft)
  const licenseLabel = license?.licenseType.nameEs ?? draft.licenseType?.nameEs ?? 'tipo por elegir'
  const railItems = [
    { id: license?.id ?? NEW_LICENSE, label: `Licencia — ${licenseLabel}`, nuevaFechaLabel: nuevoVenceLabel },
    ...issued.map((item) => ({ id: item.id, label: item.label, nuevaFechaLabel: formatDate(item.date ?? '') })),
  ]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validateDraft(draft)
    setErrors(found)
    setSubmitError(null)
    if (Object.keys(found).length > 0) {
      setShowErrorSummary(true)
      requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return
    }
    setShowErrorSummary(false)
    setPhase('submitting')
    try {
      if (draft.license) await renewLicense(draft.license.id, renewBody(draft))
      else await issueLicense(issueBody(draft, person.id))
      toast.show({ tone: 'info', message: draft.license ? 'Licencia renovada.' : 'Licencia emitida.' })
      navigate(`${personnelDetail(person.id)}?pagina=licencias`)
    } catch (error) {
      setPhase('editing')
      if (error instanceof ApiError && error.status === 409) {
        setConflict(error.message)
        return
      }
      setSubmitError(
        error instanceof ApiError && error.status < 500
          ? error.message
          : 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
      )
      requestAnimationFrame(() => errorSummaryRef.current?.focus())
    }
  }

  const errorSummary =
    showErrorSummary || submitError ? (
      <div ref={errorSummaryRef} tabIndex={-1}>
        {submitError ? (
          <Notice tone="warning" title="No se pudo completar el trámite">
            {submitError}
          </Notice>
        ) : (
          <Notice tone="warning" title="Revise los campos marcados">
            Complete los campos obligatorios antes de continuar.
          </Notice>
        )}
      </div>
    ) : undefined

  return (
    <FormPageTemplate
      status={phase}
      title={TITLE}
      breadcrumb={breadcrumb}
      subject={subject}
      onSubmit={handleSubmit}
      errorSummary={errorSummary}
      rail={
        <LicenseSummaryRail
          items={railItems}
          removals={removed.map((item) => ({ id: item.id, label: item.label, nuevaFechaLabel: '' }))}
        />
      }
      actions={
        <>
          <Button type="submit" variant="primary" loading={phase === 'submitting'}>
            {submitLabel(draft)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={phase === 'submitting'}
            onClick={() => navigate(personnelDetail(person.id))}
          >
            Cancelar
          </Button>
        </>
      }
    >
      {licenses.length > 0 ? (
        <FormSection legend="Trámite" description="Emita una licencia nueva o renueve una que la persona ya tiene.">
          <TramiteSection
            value={license?.id ?? NEW_LICENSE}
            onChange={onModeChange}
            options={[
              { value: NEW_LICENSE, label: 'Emitir una licencia nueva' },
              ...licenses.map((l) => ({
                value: l.id,
                label: `Renovar ${l.licenseType.nameEs}`,
                detail: `N° ${l.number} · vence ${formatExpiry(l.expiryDate)}`,
              })),
            ]}
          />
        </FormSection>
      ) : null}
      <FormSection legend="Licencia">
        <LicenseSection
          current={
            license
              ? {
                  tipo: license.licenseType.nameEs,
                  estadoActual: toCredentialStatus(license.status),
                  venceActualLabel: formatExpiry(license.expiryDate),
                }
              : undefined
          }
          licenseType={draft.licenseType}
          onLicenseTypeChange={(licenseType) => update({ licenseType }, ['licenseType'])}
          numero={draft.number}
          onNumeroChange={(number) => update({ number }, ['number'])}
          fechaEmision={draft.issueDate}
          onFechaEmisionChange={(issueDate) => update({ issueDate }, ['issueDate'])}
          nuevoVenceLabel={nuevoVenceLabel}
          problems={problems}
          errors={errors}
        />
      </FormSection>
      <FormSection legend="Observaciones">
        <ObservationsSection
          observations={draft.observations}
          onAdd={(option) => {
            if (!draft.observations.some((o) => o.id === option.id)) {
              update({ observations: [...draft.observations, option] })
            }
          }}
          onRemove={(observationId) =>
            update({ observations: draft.observations.filter((o) => o.id !== observationId) })
          }
        />
      </FormSection>
      <FormSection
        legend="Habilitaciones de tipo"
        description="Aeronave, función y vencimiento. Requieren una licencia vigente."
      >
        {license ? (
          <RatingsSection
            rows={ratingRows('type')}
            onToggleRenew={(ratingId) => toggle('type', ratingId, 'renew')}
            onToggleRemove={(ratingId) => toggle('type', ratingId, 'remove')}
            onDateChange={(ratingId, expiryDate) => setAction('type', ratingId, { kind: 'renew', expiryDate })}
          />
        ) : null}
        <NewTypeRatingsEditor
          ratings={draft.newTypeRatings}
          errors={errors}
          onAdd={() =>
            update({
              newTypeRatings: [
                ...draft.newTypeRatings,
                { key: newKey('nueva-tipo'), typeRating: null, fn: null, expiryDate: '' },
              ],
            })
          }
          onChange={patchNewType}
          onDiscard={(key) => update({ newTypeRatings: draft.newTypeRatings.filter((r) => r.key !== key) })}
        />
      </FormSection>
      <FormSection
        legend="Habilitaciones de clase"
        description="Clase, aeronaves y vencimiento. Requieren una licencia vigente."
      >
        {license ? (
          <RatingsSection
            rows={ratingRows('class')}
            onToggleRenew={(ratingId) => toggle('class', ratingId, 'renew')}
            onToggleRemove={(ratingId) => toggle('class', ratingId, 'remove')}
            onDateChange={(ratingId, expiryDate) => setAction('class', ratingId, { kind: 'renew', expiryDate })}
          />
        ) : null}
        <NewClassRatingsEditor
          ratings={draft.newClassRatings}
          errors={errors}
          onAdd={() =>
            update({
              newClassRatings: [
                ...draft.newClassRatings,
                { key: newKey('nueva-clase'), classRating: null, aircraft: [], expiryDate: '' },
              ],
            })
          }
          onChange={patchNewClass}
          onDiscard={(key) => update({ newClassRatings: draft.newClassRatings.filter((r) => r.key !== key) })}
        />
      </FormSection>
    </FormPageTemplate>
  )
}
