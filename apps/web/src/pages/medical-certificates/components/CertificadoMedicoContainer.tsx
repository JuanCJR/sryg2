import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { MedicalCertificateDto, MedicalValidityDto, PersonnelDto } from '@sryg/types'
import { Breadcrumb, Button, Notice, useToast } from '../../../common/components'
import { personnelDetail, PATHS } from '../../../routes'
import { ErrorTemplate } from '../../../common/components/ErrorTemplate/ErrorTemplate'
import { FormPageTemplate } from '../../../common/components/FormPageTemplate/FormPageTemplate'
import { ApiError } from '../../../common/services/fetch-json'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { CertificateFormSections } from './CertificateFormSections'
import { MedicalSubjectStrip } from './MedicalSubjectStrip'
import {
  getHolder,
  getMedicalValidity,
  listPersonCertificates,
  registerCertificate,
  renewCertificate,
} from '../services/medical-certificates-client'
import {
  previewExpiry,
  toRegisterBody,
  toRenewBody,
  validate,
  valuesFor,
  type CertificateFormErrors,
  type CertificateFormValues,
} from '../utils/certificate-form'
import { localToday } from '../utils/dates'
import { BLOCKED_TITLE, NO_CLINICAL_DATA_TITLE, STATUS_TO_BADGE } from '../utils/labels'

const TITLE = 'Registrar o renovar certificado médico'
const BLOCKED_REASON =
  'La persona tiene un bloqueo activo: no se puede registrar ni renovar el certificado médico hasta que se resuelva.'

interface FormData {
  person: PersonnelDto
  certificates: MedicalCertificateDto[]
  hasActiveBlock: boolean
  validity: MedicalValidityDto
}

async function loadFormData(id: string): Promise<FormData> {
  const [person, list, validity] = await Promise.all([getHolder(id), listPersonCertificates(id), getMedicalValidity()])
  return { person, certificates: list.items, hasActiveBlock: list.hasActiveBlock, validity }
}

const fullName = (p: PersonnelDto) => `${p.firstNames} ${p.lastNames}`.trim()
const backToTab = (id: string) => `${personnelDetail(id)}?pagina=medico`

/**
 * Certificado médico (MED-05): registers a certificate or renews one of the holder's, on the Form
 * direction. The block check runs when the page opens (an open block replaces the form with the
 * `blocked` status) and again on the server at submit: a 409 lands in the same state (BR-07).
 */
export function CertificadoMedicoContainer() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const resource = useApiResource(`medical-form:${id}`, () => loadFormData(id))
  const [blockedReason, setBlockedReason] = useState<string | null>(null)

  const data = resource.status === 'ready' ? resource.data : undefined
  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: 'Inicio', href: '/' },
        { label: 'Personal', href: PATHS.personnel },
        { label: data?.person.cedula ?? id, href: personnelDetail(id) },
        { label: 'Certificado médico' },
      ]}
    />
  )

  if (resource.status === 'loading') {
    return (
      <FormPageTemplate
        status="loading"
        title={TITLE}
        breadcrumb={breadcrumb}
        subject={<MedicalSubjectStrip loading />}
        loadingLabel="Cargando certificado médico"
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
        breadcrumb={breadcrumb}
        subject={<MedicalSubjectStrip loading />}
        error={{
          title: 'No se pudo cargar el certificado médico',
          message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
          onRetry: resource.retry,
        }}
      />
    )
  }

  const { person, certificates } = resource.data
  const latest = certificates[0]
  const reason = blockedReason ?? (resource.data.hasActiveBlock ? BLOCKED_REASON : null)
  const subject = (
    <MedicalSubjectStrip
      cedula={person.cedula}
      nombre={fullName(person)}
      status={reason ? 'bloqueada' : latest ? STATUS_TO_BADGE[latest.status] : null}
    />
  )

  if (reason) {
    return (
      <FormPageTemplate
        status="blocked"
        title={TITLE}
        breadcrumb={breadcrumb}
        subject={subject}
        blocked={{
          title: BLOCKED_TITLE,
          reason: `${reason} Resuelva el bloqueo desde el expediente antes de continuar.`,
          action: (
            <Button variant="primary" onClick={() => navigate(backToTab(person.id))}>
              Volver al expediente
            </Button>
          ),
        }}
      />
    )
  }

  return (
    <CertificateForm
      data={resource.data}
      breadcrumb={breadcrumb}
      subject={subject}
      onBlocked={setBlockedReason}
      onDone={() => navigate(backToTab(person.id))}
    />
  )
}

interface CertificateFormProps {
  data: FormData
  breadcrumb: ReactNode
  subject: ReactNode
  onBlocked: (reason: string) => void
  onDone: () => void
}

/** The editing state, mounted once the data is ready so its defaults come from it. */
function CertificateForm({ data, breadcrumb, subject, onBlocked, onDone }: CertificateFormProps) {
  const toast = useToast()
  const { person, certificates, validity } = data
  const [values, setValues] = useState<CertificateFormValues>(() =>
    valuesFor(certificates[0]?.id ?? 'new', certificates, person.cedula, localToday()),
  )
  const [errors, setErrors] = useState<CertificateFormErrors>({})
  const [summary, setSummary] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const renewing = values.mode !== 'new'

  const showSummary = (message: string) => {
    setSummary(message)
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const handleChange = (patch: Partial<CertificateFormValues>) => {
    setValues((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch)) delete next[key as keyof CertificateFormErrors]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      showSummary('Complete o corrija los campos marcados antes de continuar.')
      return
    }
    setSummary(null)
    setSubmitting(true)
    try {
      if (renewing) await renewCertificate(values.mode, toRenewBody(values))
      else await registerCertificate(person.id, toRegisterBody(values))
      toast.show({
        tone: 'info',
        message: renewing ? 'Certificado médico renovado.' : 'Certificado médico registrado.',
      })
      onDone()
    } catch (error) {
      setSubmitting(false)
      if (error instanceof ApiError && error.status === 409) {
        onBlocked(error.message)
        return
      }
      showSummary(
        error instanceof ApiError && error.status === 400
          ? `El servidor rechazó los datos: ${error.message}`
          : 'No se pudo guardar. Revise la conexión a la red local e intente de nuevo.',
      )
    }
  }

  const submitLabel = renewing ? 'Renovar certificado' : 'Registrar certificado'

  return (
    <FormPageTemplate
      status={submitting ? 'submitting' : 'editing'}
      title={TITLE}
      breadcrumb={breadcrumb}
      subject={subject}
      onSubmit={(event) => void handleSubmit(event)}
      errorSummary={
        <>
          <Notice tone="info" title={NO_CLINICAL_DATA_TITLE}>
            Solo se registran datos administrativos: clase, número, fechas, observaciones del catálogo y restricciones
            operacionales generales (RAV 67).
          </Notice>
          {summary ? (
            <div ref={summaryRef} tabIndex={-1}>
              <Notice tone="warning" title="Revise los campos marcados">
                {summary}
              </Notice>
            </div>
          ) : null}
        </>
      }
      actions={
        <>
          <Button type="submit" variant="primary" loading={submitting}>
            {submitLabel}
          </Button>
          <Button type="button" variant="secondary" disabled={submitting} onClick={onDone}>
            Cancelar
          </Button>
        </>
      }
    >
      <CertificateFormSections
        certificates={certificates}
        values={values}
        errors={errors}
        expiry={previewExpiry(values, validity)}
        onModeChange={(mode) => {
          setValues(valuesFor(mode, certificates, person.cedula, localToday()))
          setErrors({})
        }}
        onChange={handleChange}
      />
    </FormPageTemplate>
  )
}
