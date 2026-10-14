import { X } from 'lucide-react'
import type { CatalogOption, CatalogRef } from '@sryg/types'
import { FormField, IconButton } from '../../../design-system'
import { CatalogSelect } from '../../catalogs/CatalogSelect'
import styles from './ObservationsSection.module.css'

export interface ObservationsSectionProps {
  observations: CatalogRef[]
  onAdd: (option: CatalogOption) => void
  onRemove: (id: string) => void
}

/** The license's N observations (D20), from the catalog (D19). */
export function ObservationsSection({ observations, onAdd, onRemove }: ObservationsSectionProps) {
  return (
    <div className={styles.stack}>
      {observations.length === 0 ? (
        <p className={styles.empty}>Sin observaciones.</p>
      ) : (
        <ul className={styles.list}>
          {observations.map((observation) => (
            <li key={observation.id} className={styles.item}>
              <span>{observation.nameEs}</span>
              <IconButton
                icon={X}
                variant="ghost"
                iconSize={16}
                aria-label={`Quitar observación ${observation.nameEs}`}
                onClick={() => onRemove(observation.id)}
              />
            </li>
          ))}
        </ul>
      )}
      <div className={styles.add}>
        <FormField label="Agregar observación">
          {(controlProps) => (
            <CatalogSelect
              {...controlProps}
              catalog="license-observations"
              value={null}
              onChange={(option) => option && onAdd(option)}
            />
          )}
        </FormField>
      </div>
    </div>
  )
}
