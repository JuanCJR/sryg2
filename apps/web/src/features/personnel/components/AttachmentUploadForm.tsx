import type { ChangeEvent, FormEvent } from 'react'
import type { CatalogOption } from '@sryg/types'
import { Button, FormField } from '../../../design-system'
import { CatalogSelect } from '../../catalogs/CatalogSelect'
import styles from './AttachmentUploadForm.module.css'

export interface AttachmentUploadErrors {
  type?: string
  file?: string
}

export interface AttachmentUploadFormProps {
  type: CatalogOption | null
  errors: AttachmentUploadErrors
  busy: boolean
  /** Changes after a successful upload, to clear the file input. */
  resetKey: number
  onTypeChange: (type: CatalogOption | null) => void
  onFileChange: (file: File | null) => void
  onSubmit: () => void
}

/** Attaches one document with its catalog type (D21). */
export function AttachmentUploadForm({
  type,
  errors,
  busy,
  resetKey,
  onTypeChange,
  onFileChange,
  onSubmit,
}: AttachmentUploadFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit} aria-label="Adjuntar documento">
      <fieldset className={styles.fields} disabled={busy} aria-busy={busy || undefined}>
        <FormField label="Tipo de documento adjunto" error={errors.type}>
          {(control) => <CatalogSelect catalog="attachment-types" value={type} onChange={onTypeChange} {...control} />}
        </FormField>
        <FormField label="Archivo" hint="PDF, JPEG o PNG de hasta 5 MB." error={errors.file}>
          {(control) => (
            <input
              {...control}
              key={resetKey}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className={styles.file}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFileChange(event.target.files?.[0] ?? null)}
            />
          )}
        </FormField>
        <div className={styles.submit}>
          <Button type="submit" variant="primary" loading={busy}>
            Adjuntar
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
