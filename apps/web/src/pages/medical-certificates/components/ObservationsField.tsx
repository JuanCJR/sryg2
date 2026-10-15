import type { CatalogOption } from '@sryg/types'
import { Button, FormField } from '../../../common/components'
import { CatalogSelect } from '../../../common/components/CatalogSelect/CatalogSelect'
import styles from './CertificateForm.module.css'

export interface ObservationsFieldProps {
  value: CatalogOption[]
  onChange: (value: CatalogOption[]) => void
}

/** N medical observations from the D19 catalog: pick one at a time, remove any. */
export function ObservationsField({ value, onChange }: ObservationsFieldProps) {
  const add = (option: CatalogOption | null) => {
    if (option && !value.some((o) => o.id === option.id)) onChange([...value, option])
  }
  return (
    <div className={styles.observations}>
      <FormField label="Agregar observación médica" hint="Del catálogo de observaciones médicas.">
        {(controlProps) => (
          <CatalogSelect {...controlProps} catalog="medical-observations" value={null} onChange={add} />
        )}
      </FormField>
      {value.length > 0 ? (
        <ul className={styles.chips} aria-label="Observaciones seleccionadas">
          {value.map((option) => (
            <li key={option.id} className={styles.chip}>
              <span>{option.nameEs}</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Quitar ${option.nameEs}`}
                onClick={() => onChange(value.filter((o) => o.id !== option.id))}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.none}>Sin observaciones.</p>
      )}
    </div>
  )
}
