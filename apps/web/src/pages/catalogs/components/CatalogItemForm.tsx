import { useState, type FormEvent } from 'react'
import { RAV60_CATEGORIES, RAV67_CLASSES, type Rav60Category, type Rav67Class } from '@sryg/types'
import { Button, Checkbox, FormField, Input, Notice, Select } from '../../../common/components'
import { PLACEHOLDER_MARK, RAV60_LABEL, RAV67_LABEL } from '../utils/catalog-meta'
import type { CatalogItemFormValues } from '../utils/item-form'
import styles from './CatalogItemForm.module.css'

const MAX_MONTHS = 600

type Errors = Partial<Record<'nameEs' | 'rav60Category' | 'validityMonths', string>>

function validate(values: CatalogItemFormValues, licenseType: boolean): Errors {
  const errors: Errors = {}
  if (!values.nameEs.trim()) errors.nameEs = 'Escriba el nombre en español.'
  if (licenseType) {
    if (!values.rav60Category) errors.rav60Category = 'Elija la categoría RAV 60.'
    const months = values.validityMonths.trim()
    if (months && !(/^\d+$/.test(months) && Number(months) >= 1 && Number(months) <= MAX_MONTHS)) {
      errors.validityMonths = `Escriba un número entero de meses, de 1 a ${MAX_MONTHS}.`
    }
  }
  return errors
}

export interface CatalogItemFormProps {
  initial: CatalogItemFormValues
  /** License types add the D13/D20 fields and the validity (D3). */
  licenseType: boolean
  /** D3: the validity loaded is the seed's placeholder; saving confirms it. */
  validityIsPlaceholder?: boolean
  submitting: boolean
  /** A failed save, already worded for the user. */
  error?: string | null
  onSubmit: (values: CatalogItemFormValues) => void
  onCancel: () => void
}

/** The fields of a catalog item, Spanish and English (D19), validated before submitting. */
export function CatalogItemForm({
  initial,
  licenseType,
  validityIsPlaceholder = false,
  submitting,
  error,
  onSubmit,
  onCancel,
}: CatalogItemFormProps) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const set = <K extends keyof CatalogItemFormValues>(key: K, value: CatalogItemFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found = validate(values, licenseType)
    setErrors(found)
    if (Object.keys(found).length === 0) onSubmit(values)
  }

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      {error ? (
        <Notice tone="warning" title="No se pudo guardar">
          {error}
        </Notice>
      ) : null}

      <FormField label="Nombre en español" required error={errors.nameEs}>
        {(control) => (
          <Input {...control} value={values.nameEs} maxLength={200} onChange={(e) => set('nameEs', e.target.value)} />
        )}
      </FormField>
      <FormField
        label="Nombre en inglés"
        hint="Se imprime en la credencial bilingüe. Déjelo vacío si no tiene traducción."
      >
        {(control) => (
          <Input {...control} value={values.nameEn} maxLength={200} onChange={(e) => set('nameEn', e.target.value)} />
        )}
      </FormField>

      {licenseType ? (
        <>
          <FormField label="Categoría RAV 60" required error={errors.rav60Category}>
            {(control) => (
              <Select
                {...control}
                value={values.rav60Category}
                onChange={(e) => set('rav60Category', e.target.value as Rav60Category | '')}
              >
                <option value="">Elija una categoría</option>
                {RAV60_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {RAV60_LABEL[category]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField
            label="Clase médica exigida"
            hint="Certificado médico RAV 67 que hace falta para emitir o renovar la licencia."
          >
            {(control) => (
              <Select
                {...control}
                value={values.requiredMedicalClass}
                onChange={(e) => set('requiredMedicalClass', e.target.value as Rav67Class | '')}
              >
                <option value="">Ninguna</option>
                {RAV67_CLASSES.map((medicalClass) => (
                  <option key={medicalClass} value={medicalClass}>
                    {RAV67_LABEL[medicalClass]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <label className={styles.check}>
            <Checkbox checked={values.appliesExpiry} onChange={(e) => set('appliesExpiry', e.target.checked)} />
            Aplica vencimiento
          </label>
          <FormField
            label="Vigencia (meses)"
            hint={
              validityIsPlaceholder
                ? `${PLACEHOLDER_MARK}: valor provisional. Al guardar, queda confirmado.`
                : 'Meses de vigencia de las licencias de este tipo.'
            }
            error={errors.validityMonths}
          >
            {(control) => (
              <Input
                {...control}
                mono
                inputMode="numeric"
                value={values.validityMonths}
                onChange={(e) => set('validityMonths', e.target.value)}
              />
            )}
          </FormField>
        </>
      ) : null}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" loading={submitting}>
          Guardar
        </Button>
      </div>
    </form>
  )
}
