import { FormField, Input } from '../../../common/components'
import { PendingInacMark } from './PendingInacMark'
import styles from './NumberParameterField.module.css'

export interface NumberParameterFieldProps {
  label: string
  unit: string
  hint?: string
  value: string
  pending: boolean
  error?: string
  onChange: (value: string) => void
}

/** One whole-number parameter with its unit and, while it is a placeholder, the PENDIENTE INAC mark. */
export function NumberParameterField({
  label,
  unit,
  hint,
  value,
  pending,
  error,
  onChange,
}: NumberParameterFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} required>
      {(control) => (
        <div className={styles.row}>
          <Input
            {...control}
            mono
            inputMode="numeric"
            autoComplete="off"
            className={styles.input}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <span className={styles.unit}>{unit}</span>
          {pending ? <PendingInacMark /> : null}
        </div>
      )}
    </FormField>
  )
}
