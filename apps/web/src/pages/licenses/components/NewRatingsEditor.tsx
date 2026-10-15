import { Plus, X } from 'lucide-react'
import type { CatalogOption } from '@sryg/types'
import { Button, DateInput, FormField, IconButton } from '../../../common/components'
import { CatalogSelect } from '../../../common/components/CatalogSelect/CatalogSelect'
import type { NewClassRatingDraft, NewTypeRatingDraft } from '../utils/emission'
import styles from './NewRatingsEditor.module.css'

type Errors = Record<string, string>

export interface NewTypeRatingsEditorProps {
  ratings: NewTypeRatingDraft[]
  errors: Errors
  onAdd: () => void
  onChange: (key: string, patch: Partial<NewTypeRatingDraft>) => void
  onDiscard: (key: string) => void
}

/** New type ratings of the trámite (D20): aircraft model + function + expiry. */
export function NewTypeRatingsEditor({ ratings, errors, onAdd, onChange, onDiscard }: NewTypeRatingsEditorProps) {
  return (
    <div className={styles.stack}>
      {ratings.map((rating, index) => {
        const name = `de la habilitación de tipo ${index + 1}`
        return (
          <div key={rating.key} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Nueva habilitación de tipo {index + 1}</span>
              <IconButton
                icon={X}
                variant="ghost"
                iconSize={16}
                aria-label={`Descartar habilitación de tipo ${index + 1}`}
                onClick={() => onDiscard(rating.key)}
              />
            </div>
            <div className={styles.grid}>
              <FormField label="Aeronave" required error={errors[`${rating.key}-typeRating`]}>
                {(controlProps) => (
                  <CatalogSelect
                    {...controlProps}
                    aria-label={`Aeronave ${name}`}
                    catalog="type-ratings"
                    value={rating.typeRating}
                    onChange={(typeRating) => onChange(rating.key, { typeRating })}
                  />
                )}
              </FormField>
              <FormField label="Función" required error={errors[`${rating.key}-fn`]}>
                {(controlProps) => (
                  <CatalogSelect
                    {...controlProps}
                    aria-label={`Función ${name}`}
                    catalog="functions"
                    value={rating.fn}
                    onChange={(fn) => onChange(rating.key, { fn })}
                  />
                )}
              </FormField>
              <FormField label="Vencimiento" required error={errors[`${rating.key}-expiry`]}>
                {(controlProps) => (
                  <DateInput
                    {...controlProps}
                    aria-label={`Vencimiento ${name}`}
                    value={rating.expiryDate}
                    onChange={(event) => onChange(rating.key, { expiryDate: event.target.value })}
                  />
                )}
              </FormField>
            </div>
          </div>
        )
      })}
      <div>
        <Button variant="secondary" size="sm" icon={Plus} onClick={onAdd}>
          Agregar habilitación de tipo
        </Button>
      </div>
    </div>
  )
}

export interface NewClassRatingsEditorProps {
  ratings: NewClassRatingDraft[]
  errors: Errors
  onAdd: () => void
  onChange: (key: string, patch: Partial<NewClassRatingDraft>) => void
  onDiscard: (key: string) => void
}

/** New class ratings of the trámite (D20): class + list of aircraft + expiry. */
export function NewClassRatingsEditor({ ratings, errors, onAdd, onChange, onDiscard }: NewClassRatingsEditorProps) {
  const addAircraft = (rating: NewClassRatingDraft, option: CatalogOption) => {
    if (rating.aircraft.some((a) => a.id === option.id)) return
    onChange(rating.key, { aircraft: [...rating.aircraft, option] })
  }
  return (
    <div className={styles.stack}>
      {ratings.map((rating, index) => {
        const name = `de la habilitación de clase ${index + 1}`
        return (
          <div key={rating.key} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Nueva habilitación de clase {index + 1}</span>
              <IconButton
                icon={X}
                variant="ghost"
                iconSize={16}
                aria-label={`Descartar habilitación de clase ${index + 1}`}
                onClick={() => onDiscard(rating.key)}
              />
            </div>
            <div className={styles.grid}>
              <FormField label="Clase" required error={errors[`${rating.key}-classRating`]}>
                {(controlProps) => (
                  <CatalogSelect
                    {...controlProps}
                    aria-label={`Clase ${name}`}
                    catalog="class-ratings"
                    value={rating.classRating}
                    onChange={(classRating) => onChange(rating.key, { classRating })}
                  />
                )}
              </FormField>
              <FormField label="Vencimiento" required error={errors[`${rating.key}-expiry`]}>
                {(controlProps) => (
                  <DateInput
                    {...controlProps}
                    aria-label={`Vencimiento ${name}`}
                    value={rating.expiryDate}
                    onChange={(event) => onChange(rating.key, { expiryDate: event.target.value })}
                  />
                )}
              </FormField>
              <div className={styles.wide}>
                <FormField label="Agregar aeronave">
                  {(controlProps) => (
                    <CatalogSelect
                      {...controlProps}
                      aria-label={`Aeronaves ${name}`}
                      catalog="aircraft"
                      value={null}
                      onChange={(option) => option && addAircraft(rating, option)}
                    />
                  )}
                </FormField>
                {rating.aircraft.length > 0 ? (
                  <ul className={styles.chips} aria-label={`Aeronaves ${name}`}>
                    {rating.aircraft.map((aircraft) => (
                      <li key={aircraft.id} className={styles.chip}>
                        {aircraft.nameEs}
                        <IconButton
                          icon={X}
                          variant="ghost"
                          iconSize={16}
                          aria-label={`Quitar aeronave ${aircraft.nameEs}`}
                          onClick={() =>
                            onChange(rating.key, { aircraft: rating.aircraft.filter((a) => a.id !== aircraft.id) })
                          }
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
      <div>
        <Button variant="secondary" size="sm" icon={Plus} onClick={onAdd}>
          Agregar habilitación de clase
        </Button>
      </div>
    </div>
  )
}
