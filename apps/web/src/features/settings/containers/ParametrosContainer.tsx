import { useRef, useState, type FormEvent } from 'react'
import {
  GRAPHIC_RESOURCE_KINDS,
  type GraphicResourceDto,
  type GraphicResourceKind,
  RAV67_CLASSES,
  type SettingsParametersDto,
} from '@sryg/types'
import { Breadcrumb, Button, Notice, useToast } from '../../../design-system'
import { FormPageTemplate } from '../../../app/templates/FormPageTemplate'
import { FormSection } from '../../../app/templates/FormSection'
import { useApiResource } from '../../../shared/api/useApiResource'
import {
  getGraphicResourceImage,
  getParameters,
  listGraphicResources,
  putAlertThreshold,
  putMedicalValidity,
  uploadGraphicResource,
} from '../data/settings-client'
import { useDataUrl } from '../data/useDataUrl'
import {
  formatSize,
  GRAPHIC_RESOURCE_LABELS,
  graphicFileError,
  MEDICAL_CLASS_LABELS,
  type ParameterField,
  type ParameterValues,
  planParametersSave,
  toFormValues,
} from '../domain/parameters-form'
import { GraphicResourceField } from '../components/GraphicResourceField'
import { NumberParameterField } from '../components/NumberParameterField'

const TITLE = 'Parámetros'
const FILE_LABELS: Record<GraphicResourceKind, string> = {
  logo_inac: 'Archivo del logo del INAC',
  firma_presidente: 'Archivo de la firma del Presidente',
}

const breadcrumb = (
  <Breadcrumb items={[{ label: 'Inicio', href: '/' }, { label: 'Administración' }, { label: TITLE }]} />
)

/**
 * Parámetros (page 12, D3, D15, D18): one page with Vigencias (RAV 67 classes), Alertas and
 * Credencial. License-type validity lives in its catalog (W1-11). Admin only (route guard).
 */
export function ParametrosContainer() {
  const parameters = useApiResource('settings:parameters', () => getParameters())
  const resources = useApiResource('settings:graphic-resources', () => listGraphicResources())
  const [version, setVersion] = useState(0)

  if (parameters.status === 'error' || resources.status === 'error') {
    const retry = () => {
      if (parameters.status !== 'loading') parameters.retry()
      if (resources.status !== 'loading') resources.retry()
    }
    return (
      <FormPageTemplate
        status="error"
        title={TITLE}
        breadcrumb={breadcrumb}
        error={{
          title: 'No se pudieron cargar los parámetros',
          message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
          onRetry: retry,
        }}
      />
    )
  }
  if (parameters.status === 'loading' || resources.status === 'loading')
    return (
      <FormPageTemplate status="loading" title={TITLE} breadcrumb={breadcrumb} loadingLabel="Cargando parámetros" />
    )

  return (
    <ParametrosForm
      // A fresh form, with the saved values, after every save.
      key={version}
      parameters={parameters.data}
      resources={resources.data}
      onSaved={() => {
        setVersion((v) => v + 1)
        parameters.retry()
        resources.retry()
      }}
    />
  )
}

type Summary = { kind: 'invalid' } | { kind: 'failed'; message: string } | null

interface ParametrosFormProps {
  parameters: SettingsParametersDto
  resources: GraphicResourceDto[]
  onSaved: () => void
}

function ParametrosForm({ parameters, resources, onSaved }: ParametrosFormProps) {
  const toast = useToast()
  const [values, setValues] = useState<ParameterValues>(() => toFormValues(parameters))
  const [errors, setErrors] = useState<Partial<Record<ParameterField, string>>>({})
  const [files, setFiles] = useState<Partial<Record<GraphicResourceKind, File>>>({})
  const [fileErrors, setFileErrors] = useState<Partial<Record<GraphicResourceKind, string>>>({})
  const [phase, setPhase] = useState<'editing' | 'submitting'>('editing')
  const [summary, setSummary] = useState<Summary>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const setValue = (field: ParameterField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const selectFile = (kind: GraphicResourceKind, file: File) => {
    const error = graphicFileError(file)
    setFileErrors((current) => ({ ...current, [kind]: error ?? undefined }))
    // A rejected file never replaces the one already chosen.
    if (!error) setFiles((current) => ({ ...current, [kind]: file }))
  }

  const showSummary = (next: Summary) => {
    setSummary(next)
    requestAnimationFrame(() => summaryRef.current?.focus())
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = planParametersSave(values, parameters)
    if (!validation.ok) {
      setErrors(validation.errors)
      showSummary({ kind: 'invalid' })
      return
    }
    const { plan } = validation
    const uploads = GRAPHIC_RESOURCE_KINDS.flatMap((kind) => (files[kind] ? [[kind, files[kind]] as const] : []))
    if (!plan.medicalValidity && plan.alertThresholdDays === undefined && uploads.length === 0) {
      setSummary(null)
      toast.show({ tone: 'info', message: 'No hay cambios para guardar.' })
      return
    }
    setSummary(null)
    setPhase('submitting')
    try {
      if (plan.medicalValidity) await putMedicalValidity(plan.medicalValidity)
      if (plan.alertThresholdDays !== undefined) await putAlertThreshold({ days: plan.alertThresholdDays })
      for (const [kind, file] of uploads) await uploadGraphicResource(kind, file)
    } catch (error) {
      setPhase('editing')
      showSummary({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
      return
    }
    toast.show({ tone: 'info', message: 'Parámetros guardados.' })
    onSaved()
  }

  const byKind = new Map(resources.map((r) => [r.kind, r]))

  return (
    <FormPageTemplate
      status={phase}
      title={TITLE}
      breadcrumb={breadcrumb}
      onSubmit={(event) => void handleSubmit(event)}
      errorSummary={
        summary ? (
          <div ref={summaryRef} tabIndex={-1}>
            {summary.kind === 'invalid' ? (
              <Notice tone="warning" title="Revise los campos marcados">
                Los parámetros deben ser números enteros mayores que cero.
              </Notice>
            ) : (
              <Notice tone="warning" title="No se pudieron guardar los parámetros">
                {summary.message} Revise los valores y vuelva a intentarlo.
              </Notice>
            )}
          </div>
        ) : undefined
      }
      actions={
        <Button type="submit" variant="primary" loading={phase === 'submitting'}>
          Guardar parámetros
        </Button>
      }
    >
      <FormSection
        legend="Vigencias"
        description="Meses de vigencia del certificado médico por clase RAV 67. La vigencia de cada tipo de licencia se edita en su catálogo."
      >
        {RAV67_CLASSES.map((rav67Class) => (
          <NumberParameterField
            key={rav67Class}
            label={MEDICAL_CLASS_LABELS[rav67Class]}
            unit="meses"
            value={values[rav67Class]}
            pending={parameters.medicalValidityMonths[rav67Class].isPlaceholder}
            error={errors[rav67Class]}
            onChange={(value) => setValue(rav67Class, value)}
          />
        ))}
      </FormSection>
      <FormSection
        legend="Alertas"
        description="Una credencial pasa a «próxima a vencer» cuando faltan estos días o menos para su vencimiento."
      >
        <NumberParameterField
          label="Umbral de próxima a vencer"
          unit="días"
          value={values.threshold}
          pending={parameters.alertThresholdDays.isPlaceholder}
          error={errors.threshold}
          onChange={(value) => setValue('threshold', value)}
        />
      </FormSection>
      <FormSection
        legend="Credencial"
        description="Imágenes que se imprimen en las credenciales: PNG o JPEG de hasta 500 KB. Mientras falten, el PDF muestra un espacio reservado."
      >
        {GRAPHIC_RESOURCE_KINDS.map((kind) => (
          <GraphicResourceSlot
            key={kind}
            resource={byKind.get(kind) ?? null}
            kind={kind}
            file={files[kind] ?? null}
            error={fileErrors[kind]}
            onSelect={(file) => selectFile(kind, file)}
          />
        ))}
      </FormSection>
    </FormPageTemplate>
  )
}

interface GraphicResourceSlotProps {
  kind: GraphicResourceKind
  resource: GraphicResourceDto | null
  file: File | null
  error?: string
  onSelect: (file: File) => void
}

/** Loads the stored image (it needs the bearer token, so it cannot be a plain `<img src>`). */
function GraphicResourceSlot({ kind, resource, file, error, onSelect }: GraphicResourceSlotProps) {
  const configured = resource?.configured ? resource : null
  const stored = useApiResource(configured ? `settings:image:${kind}:${configured.updatedAt}` : null, () =>
    getGraphicResourceImage(kind),
  )
  const currentSrc = useDataUrl(stored.status === 'ready' ? stored.data : null)
  const pendingSrc = useDataUrl(file)
  return (
    <GraphicResourceField
      label={GRAPHIC_RESOURCE_LABELS[kind]}
      fileLabel={FILE_LABELS[kind]}
      current={
        configured
          ? {
              src: currentSrc,
              detail: `${configured.mime === 'image/png' ? 'PNG' : 'JPEG'}, ${formatSize(configured.size ?? 0)}`,
            }
          : null
      }
      pendingSrc={pendingSrc}
      pendingName={file?.name ?? null}
      error={error}
      onSelect={onSelect}
    />
  )
}
