import { Radio } from '../../../design-system'
import styles from './TramiteSection.module.css'

export interface TramiteOption {
  /** `nueva` or the id of the license to renew. */
  value: string
  label: string
  detail?: string
}

export interface TramiteSectionProps {
  options: TramiteOption[]
  value: string
  onChange: (value: string) => void
}

/** Which trámite the page runs: issue a new license, or renew one the person already holds. */
export function TramiteSection({ options, value, onChange }: TramiteSectionProps) {
  return (
    <div className={styles.list} role="radiogroup" aria-label="Trámite">
      {options.map((option) => {
        const id = `tramite-${option.value}`
        return (
          <div key={option.value} className={styles.option}>
            <Radio
              id={id}
              name="tramite"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <label htmlFor={id} className={styles.label}>
              {option.label}
              {option.detail ? <span className={styles.detail}>{option.detail}</span> : null}
            </label>
          </div>
        )
      })}
    </div>
  )
}
