import { useState } from 'react'
import { FormField } from '../../../design-system'
import { BLOCK_STOPS_LABEL } from '../domain/block-view'
import { BlockFormDialog } from './BlockFormDialog'
import styles from './BlockFormDialog.module.css'

export interface ResolveBlockDialogProps {
  /** "BLQ-… · tipo — motivo", to name the block being lifted. */
  blockLabel: string
  submitting: boolean
  error: string | null
  onSubmit: (resolutionNote: string) => void
  onCancel: () => void
}

/** BR-08: lifts a block; the resolution note is mandatory. Render it only while open. */
export function ResolveBlockDialog({ blockLabel, submitting, error, onSubmit, onCancel }: ResolveBlockDialogProps) {
  const [note, setNote] = useState('')
  const [touched, setTouched] = useState(false)
  const noteError = touched && !note.trim() ? 'Escriba cómo se solventó el impedimento.' : undefined

  return (
    <BlockFormDialog
      title="Resolver bloqueo"
      consequence={`${blockLabel}. Al resolverlo deja de detener la ${BLOCK_STOPS_LABEL}; la nota queda en el historial.`}
      submitLabel="Resolver"
      submitting={submitting}
      error={error}
      onCancel={onCancel}
      onSubmit={() => {
        setTouched(true)
        if (note.trim()) onSubmit(note.trim())
      }}
    >
      <FormField label="Nota de resolución" required error={noteError}>
        {(control) => (
          <textarea
            {...control}
            className={styles.textarea}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </FormField>
    </BlockFormDialog>
  )
}
