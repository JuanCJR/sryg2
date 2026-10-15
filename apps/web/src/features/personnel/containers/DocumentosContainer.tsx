import { useState } from 'react'
import type { CatalogOption, PersonnelAttachmentDto, PersonnelDto } from '@sryg/types'
import { ConfirmDialog, Pagination, Skeleton, useToast } from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { ApiError } from '../../../shared/api/fetch-json'
import { useApiResource } from '../../../shared/api/useApiResource'
import { useClientPagination } from '../../../shared/hooks/useClientPagination'
import { AttachmentUploadForm, type AttachmentUploadErrors } from '../components/AttachmentUploadForm'
import { DocumentsTable } from '../components/DocumentsTable'
import { TabMessage } from '../components/TabMessage'
import { deleteAttachment, downloadAttachment, listAttachments, uploadAttachment } from '../data/personnel-client'
import { attachmentFileError, attachmentStatusMessage } from '../domain/attachments'
import styles from './DocumentosContainer.module.css'

/** Saves a downloaded blob under its original name. */
function saveBlob(blob: Blob, filename: string) {
  if (typeof URL.createObjectURL !== 'function') return
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Give the browser a moment to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const NO_ATTACHMENTS: PersonnelAttachmentDto[] = []

/** Documentos page key: the person's attached documents (D21). */
export function DocumentosContainer({ person }: { person: PersonnelDto }) {
  const { can } = useRole()
  const toast = useToast()
  const canWrite = can('personnel', 'write')
  const resource = useApiResource(`personnel:${person.id}:attachments`, () => listAttachments(person.id))
  // The API returns the whole list; it pages here, 10 rows at a time.
  const pages = useClientPagination(resource.status === 'ready' ? resource.data : NO_ATTACHMENTS)

  const [type, setType] = useState<CatalogOption | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<AttachmentUploadErrors>({})
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [toDelete, setToDelete] = useState<PersonnelAttachmentDto | null>(null)

  const chooseFile = (next: File | null) => {
    const problem = next ? attachmentFileError(next) : null
    setFile(problem ? null : next)
    setErrors((current) => ({ ...current, file: problem ?? undefined }))
  }

  const upload = async () => {
    const missing: AttachmentUploadErrors = {
      type: type ? undefined : 'Elija el tipo de documento.',
      file: file ? undefined : (errors.file ?? 'Elija un archivo PDF o una imagen.'),
    }
    if (!type || !file) return setErrors(missing)
    setBusy(true)
    try {
      await uploadAttachment(person.id, type.id, file)
      setType(null)
      setFile(null)
      setErrors({})
      setResetKey((key) => key + 1)
      toast.show({ tone: 'info', message: `${file.name} quedó adjuntado.` })
      if (resource.status !== 'loading') resource.retry()
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0
      const fileMessage = attachmentStatusMessage(status)
      if (fileMessage) setErrors({ file: fileMessage })
      else if (status === 400) setErrors({ type: 'Elija un tipo activo del catálogo.' })
      else toast.show({ tone: 'error', message: 'No se pudo adjuntar el documento. Intente de nuevo.' })
    } finally {
      setBusy(false)
    }
  }

  const download = async (attachment: PersonnelAttachmentDto) => {
    try {
      saveBlob(await downloadAttachment(person.id, attachment.id), attachment.filename)
    } catch {
      toast.show({ tone: 'error', message: `No se pudo descargar ${attachment.filename}.` })
    }
  }

  const confirmDelete = async () => {
    const attachment = toDelete
    setToDelete(null)
    if (!attachment) return
    try {
      await deleteAttachment(person.id, attachment.id)
      toast.show({ tone: 'info', message: `${attachment.filename} fue eliminado.` })
    } catch {
      toast.show({ tone: 'error', message: `No se pudo eliminar ${attachment.filename}.` })
    }
    if (resource.status !== 'loading') resource.retry()
  }

  let list
  if (resource.status === 'loading') {
    list = (
      <>
        <Skeleton style={{ display: 'block', height: 120 }} />
        <span role="status" className="visually-hidden">
          Cargando documentos
        </span>
      </>
    )
  } else if (resource.status === 'error') {
    list = (
      <TabMessage
        title="No se pudieron cargar los documentos"
        message="El servidor no respondió. Revise la conexión a la red local e intente de nuevo."
        onRetry={resource.retry}
      />
    )
  } else if (resource.data.length === 0) {
    list = (
      <TabMessage
        title="Aún no hay documentos adjuntos"
        message={canWrite ? 'Adjunte el primero con el formulario de abajo.' : 'Cuando se adjunte uno aparecerá aquí.'}
      />
    )
  } else {
    list = (
      <>
        <DocumentsTable
          attachments={pages.pageItems}
          canDelete={canWrite}
          onDownload={(attachment) => void download(attachment)}
          onDelete={setToDelete}
        />
        <Pagination
          className={styles.pagination}
          page={pages.page}
          pageCount={pages.pageCount}
          onPageChange={pages.setPage}
          total={pages.total}
          pageSize={pages.pageSize}
          onPageSizeChange={pages.setPageSize}
        />
      </>
    )
  }

  return (
    <div>
      {list}
      {canWrite ? (
        <AttachmentUploadForm
          type={type}
          errors={errors}
          busy={busy}
          resetKey={resetKey}
          onTypeChange={(next) => {
            setType(next)
            setErrors((current) => ({ ...current, type: undefined }))
          }}
          onFileChange={chooseFile}
          onSubmit={() => void upload()}
        />
      ) : null}
      <ConfirmDialog
        open={toDelete !== null}
        title="Eliminar documento"
        consequence={`Se eliminará ${toDelete?.filename ?? 'el documento'} del expediente. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
