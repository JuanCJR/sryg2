import { useState } from 'react'
import { BLOCK_TYPES, type BlockType } from '@sryg/types'
import { FormField, Select } from '../../../design-system'
import { BLOCK_STOPS_LABEL, BLOCK_TYPE_LABEL } from '../domain/block-view'
import { BlockFormDialog } from './BlockFormDialog'
import styles from './BlockFormDialog.module.css'

export interface RegisterBlockValues {
  type: BlockType
  reason: string
}

export interface RegisterBlockDialogProps {
  /** "cédula · nombre", to name whom the block stops. */
  personLabel: string
  submitting: boolean
  error: string | null
  onSubmit: (values: RegisterBlockValues) => void
  onCancel: () => void
}

/** BR-07: registers an impediment on the person. Render it only while open. */
export function RegisterBlockDialog({ personLabel, submitting, error, onSubmit, onCancel }: RegisterBlockDialogProps) {
  const [type, setType] = useState<BlockType | ''>('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const typeError = touched && !type ? 'Seleccione el tipo de bloqueo.' : undefined
  const reasonError = touched && !reason.trim() ? 'Escriba el motivo del bloqueo.' : undefined

  return (
    <BlockFormDialog
      title="Registrar bloqueo"
      consequence={`${personLabel} quedará bloqueada: se detiene la ${BLOCK_STOPS_LABEL} hasta que el bloqueo se resuelva.`}
      submitLabel="Registrar"
      submitting={submitting}
      error={error}
      onCancel={onCancel}
      onSubmit={() => {
        setTouched(true)
        if (type && reason.trim()) onSubmit({ type, reason: reason.trim() })
      }}
    >
      <FormField label="Tipo" required error={typeError}>
        {(control) => (
          <Select {...control} value={type} onChange={(event) => setType(event.target.value as BlockType | '')}>
            <option value="">Seleccione…</option>
            {BLOCK_TYPES.map((value) => (
              <option key={value} value={value}>
                {BLOCK_TYPE_LABEL[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField
        label="Motivo"
        required
        error={reasonError}
        hint="El impedimento administrativo, médico o regulatorio."
      >
        {(control) => (
          <textarea
            {...control}
            className={styles.textarea}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        )}
      </FormField>
    </BlockFormDialog>
  )
}
