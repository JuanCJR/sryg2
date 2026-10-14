import { useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import type { CatalogOption, PersonnelDto, PersonnelImageKind } from '@sryg/types'
import { Breadcrumb, Button, Notice, useToast } from '../../../design-system'
import { PATHS, personnelDetail } from '../../../app/routes'
import { ErrorTemplate } from '../../../app/templates/ErrorTemplate'
import { FormPageTemplate } from '../../../app/templates/FormPageTemplate'
import { ApiError } from '../../../shared/api/fetch-json'
import { useApiResource } from '../../../shared/api/useApiResource'
import { PersonnelFormSections } from '../components/PersonnelFormSections'
import {
  createPersonnel,
  findCatalogOption,
  getPersonnel,
  updatePersonnel,
  uploadPersonnelImage,
} from '../data/personnel-client'
import {
  EMPTY_PERSONNEL_FORM,
  fieldFor,
  formFromPersonnel,
  imageFileError,
  messageFor,
  type PersonnelFormErrors,
  type PersonnelFormValues,
  toCreateInput,
  toUpdateInput,
} from '../domain/personnel-form'
import { fullName } from '../domain/person-view'
import { useObjectUrl, useStoredImageUrl } from './useObjectUrl'

const IMAGE_NAME: Record<PersonnelImageKind, string> = { photo: 'la foto', signature: 'la firma' }

/** A catalog item the record keeps but the active options no longer list (deactivated since). */
const inactiveOption = (id: string): CatalogOption => ({ id, nameEs: 'Ítem inactivo del catálogo', nameEn: null })

async function resolveOption(catalog: 'document-types' | 'nationalities', id: string | null) {
  if (!id) return null
  return (await findCatalogOption(catalog, id)) ?? inactiveOption(id)
}

/** /personal/nuevo — Registro de personal (PER-06, D21). */
export function RegistroPersonalContainer() {
  return <PersonnelForm key="nuevo" />
}

/** /personal/:id/editar — loads the record and its catalog names first. */
export function EditarPersonalContainer() {
  const { id = '' } = useParams()
  const resource = useApiResource(`personnel-form:${id}`, async () => {
    const dto = await getPersonnel(id)
    const [documentType, nationality] = await Promise.all([
      resolveOption('document-types', dto.documentTypeId),
      resolveOption('nationalities', dto.nationalityId),
    ])
    return { dto, documentType, nationality }
  })

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
        title="Editar datos del personal"
        status="error"
        error={{
          title: 'No se pudieron cargar los datos',
          message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
          onRetry: resource.retry,
        }}
      />
    )
  }
  if (resource.status === 'loading') {
    return <FormPageTemplate title="Editar datos del personal" status="loading" loadingLabel="Cargando datos" />
  }
  const { dto, documentType, nationality } = resource.data
  return <PersonnelForm key={dto.id} dto={dto} initial={formFromPersonnel(dto, { documentType, nationality })} />
}

interface PersonnelFormProps {
  /** The record being edited; undefined on the Registro. */
  dto?: PersonnelDto
  initial?: PersonnelFormValues
}

function PersonnelForm({ dto, initial = EMPTY_PERSONNEL_FORM }: PersonnelFormProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<PersonnelFormErrors>({})
  const [images, setImages] = useState<Partial<Record<PersonnelImageKind, File>>>({})
  const [phase, setPhase] = useState<'editing' | 'submitting'>('editing')
  const [summary, setSummary] = useState<'fields' | 'server' | null>(null)
  const summaryRef = useRef<HTMLDivElement>(null)

  const storedPhoto = useStoredImageUrl(dto?.id ?? '', 'photo', Boolean(dto?.hasPhoto))
  const storedSignature = useStoredImageUrl(dto?.id ?? '', 'signature', Boolean(dto?.hasSignature))
  const newPhoto = useObjectUrl(images.photo)
  const newSignature = useObjectUrl(images.signature)

  const isEdit = Boolean(dto)
  const title = isEdit ? 'Editar datos del personal' : 'Registro de personal'
  const backTo = dto ? personnelDetail(dto.id) : PATHS.personnel
  const breadcrumb = (
    <Breadcrumb
      items={
        dto
          ? [
              { label: 'Personal', href: PATHS.personnel },
              { label: dto.cedula, href: personnelDetail(dto.id) },
              { label: 'Editar datos' },
            ]
          : [{ label: 'Personal', href: PATHS.personnel }, { label: 'Registro' }]
      }
    />
  )

  const change = <K extends keyof PersonnelFormValues>(field: K, value: PersonnelFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const selectImage = (kind: PersonnelImageKind) => (file: File) => {
    const problem = imageFileError(file)
    setErrors((current) => ({ ...current, [kind]: problem ?? undefined }))
    if (!problem) setImages((current) => ({ ...current, [kind]: file }))
  }

  /** Shows the errors and the summary above the form, and moves the focus there. Returns null. */
  const fail = (next: PersonnelFormErrors, kind: 'fields' | 'server'): null => {
    setErrors((current) => ({ ...current, ...next }))
    setSummary(kind)
    requestAnimationFrame(() => summaryRef.current?.focus())
    return null
  }

  /** Uploads the chosen images after the record is saved; returns the ones that failed. */
  const uploadImages = async (id: string) => {
    const failed: PersonnelImageKind[] = []
    for (const [kind, file] of Object.entries(images) as Array<[PersonnelImageKind, File]>) {
      await uploadPersonnelImage(id, kind, file).catch(() => failed.push(kind))
    }
    return failed
  }

  /** Validates and returns the save to run, or null (errors shown, or nothing to save). */
  const prepare = (): (() => Promise<PersonnelDto>) | null => {
    if (!dto) {
      const result = toCreateInput(values)
      if (!result.ok) return fail(result.errors, 'fields')
      return () => createPersonnel(result.value)
    }
    const result = toUpdateInput(values, dto)
    if (!result.ok) return fail(result.errors, 'fields')
    const changes = result.value
    if (changes) return () => updatePersonnel(dto.id, changes)
    if (Object.keys(images).length > 0) return () => Promise.resolve(dto)
    toast.show({ tone: 'info', message: 'No hay cambios que guardar.' })
    navigate(personnelDetail(dto.id))
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const save = prepare()
    if (!save) return

    setSummary(null)
    setPhase('submitting')
    try {
      const saved = await save()
      const failed = await uploadImages(saved.id)
      toast.show(
        failed.length > 0
          ? {
              tone: 'warning',
              message: `Se guardaron los datos, pero no ${failed.map((kind) => IMAGE_NAME[kind]).join(' ni ')}. Intente subirla de nuevo.`,
            }
          : { tone: 'info', message: dto ? 'Datos actualizados.' : `${fullName(saved)} quedó registrada.` },
      )
      navigate(personnelDetail(saved.id))
    } catch (error) {
      setPhase('editing')
      if (error instanceof ApiError && error.status === 409) {
        return fail({ cedula: 'Ya existe una persona con este número de documento.' }, 'fields')
      }
      const details = error instanceof ApiError ? (error.body as { details?: unknown } | undefined)?.details : null
      if (error instanceof ApiError && error.status === 400 && Array.isArray(details)) {
        const next: PersonnelFormErrors = {}
        for (const { path } of details as Array<{ path: string }>) {
          next[fieldFor(path)] =
            path === 'documentTypeId' || path === 'nationalityId'
              ? 'Elija un ítem activo del catálogo.'
              : messageFor(path)
        }
        return fail(next, 'fields')
      }
      fail({}, 'server')
    }
  }

  return (
    <FormPageTemplate
      status={phase}
      title={title}
      breadcrumb={breadcrumb}
      onSubmit={(event) => void handleSubmit(event)}
      errorSummary={
        summary ? (
          <div ref={summaryRef} tabIndex={-1}>
            {summary === 'fields' ? (
              <Notice tone="warning" title="Revise los campos marcados">
                Corrija los datos señalados antes de guardar.
              </Notice>
            ) : (
              <Notice tone="warning" title="No se pudieron guardar los datos">
                El servidor no respondió. Revise la conexión a la red local e intente de nuevo.
              </Notice>
            )}
          </div>
        ) : undefined
      }
      actions={
        <>
          <Button type="submit" variant="primary" loading={phase === 'submitting'}>
            {isEdit ? 'Guardar cambios' : 'Registrar'}
          </Button>
          <Button type="button" variant="secondary" disabled={phase === 'submitting'} onClick={() => navigate(backTo)}>
            Cancelar
          </Button>
        </>
      }
    >
      <PersonnelFormSections
        values={values}
        errors={errors}
        onChange={change}
        showStatus={isEdit}
        photoUrl={newPhoto ?? storedPhoto}
        signatureUrl={newSignature ?? storedSignature}
        onPhoto={selectImage('photo')}
        onSignature={selectImage('signature')}
      />
    </FormPageTemplate>
  )
}
