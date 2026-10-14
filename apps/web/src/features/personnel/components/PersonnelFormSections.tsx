import type { ReactNode } from 'react'
import { BLOOD_TYPES, PERSONNEL_STATUSES, RAV60_CATEGORIES } from '@sryg/types'
import { DateInput, FormField, Input, Select } from '../../../design-system'
import { FormSection } from '../../../app/templates/FormSection'
import { CatalogSelect } from '../../catalogs/CatalogSelect'
import { BLOOD_TYPE_LABEL, CATEGORY_LABEL, STATUS_LABEL } from '../domain/person-view'
import type { PersonnelFormErrors, PersonnelFormValues } from '../domain/personnel-form'
import { ImageField } from './ImageField'
import styles from './PersonnelFormSections.module.css'

export interface PersonnelFormSectionsProps {
  values: PersonnelFormValues
  errors: PersonnelFormErrors
  onChange: <K extends keyof PersonnelFormValues>(field: K, value: PersonnelFormValues[K]) => void
  /** Only the edit form shows the institutional status (a new record starts active). */
  showStatus: boolean
  photoUrl?: string
  signatureUrl?: string
  onPhoto: (file: File) => void
  onSignature: (file: File) => void
}

const IMAGE_HINT = 'JPEG, PNG o WebP de hasta 5 MB. El sistema la comprime a 200 KB.'

function Grid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>
}

/** The sections of the Registro / Editar form (D21): presentational, the container owns state. */
export function PersonnelFormSections({
  values,
  errors,
  onChange,
  showStatus,
  photoUrl,
  signatureUrl,
  onPhoto,
  onSignature,
}: PersonnelFormSectionsProps) {
  const text = (field: 'cedula' | 'firstNames' | 'lastNames' | 'email' | 'phone' | 'cargo' | 'dependencia') =>
    ({
      value: values[field],
      onChange: (event: { target: { value: string } }) => onChange(field, event.target.value),
    }) as const

  return (
    <>
      <FormSection legend="Identificación">
        <Grid>
          <FormField label="Tipo de documento" error={errors.documentType}>
            {(control) => (
              <CatalogSelect
                catalog="document-types"
                value={values.documentType}
                onChange={(option) => onChange('documentType', option)}
                {...control}
              />
            )}
          </FormField>
          <FormField
            label="Número de documento"
            required
            hint="De 6 a 9 dígitos; se aceptan puntos y la V inicial."
            error={errors.cedula}
          >
            {(control) => <Input mono autoComplete="off" inputMode="numeric" {...text('cedula')} {...control} />}
          </FormField>
          <FormField label="Nombres" required error={errors.firstNames}>
            {(control) => <Input autoComplete="off" {...text('firstNames')} {...control} />}
          </FormField>
          <FormField label="Apellidos" required error={errors.lastNames}>
            {(control) => <Input autoComplete="off" {...text('lastNames')} {...control} />}
          </FormField>
          <FormField label="Nacionalidad" error={errors.nationality}>
            {(control) => (
              <CatalogSelect
                catalog="nationalities"
                value={values.nationality}
                onChange={(option) => onChange('nationality', option)}
                {...control}
              />
            )}
          </FormField>
          <FormField label="Fecha de nacimiento" error={errors.birthDate}>
            {(control) => (
              <DateInput
                value={values.birthDate}
                onChange={(event) => onChange('birthDate', event.target.value)}
                {...control}
              />
            )}
          </FormField>
        </Grid>
      </FormSection>

      <FormSection legend="Contacto">
        <Grid>
          <FormField label="Correo electrónico" error={errors.email}>
            {(control) => <Input type="email" autoComplete="off" {...text('email')} {...control} />}
          </FormField>
          <FormField label="Teléfono" error={errors.phone}>
            {(control) => <Input type="tel" autoComplete="off" {...text('phone')} {...control} />}
          </FormField>
          <div className={styles.wide}>
            <FormField label="Dirección" error={errors.address}>
              {(control) => (
                <Input
                  autoComplete="off"
                  value={values.address}
                  onChange={(event) => onChange('address', event.target.value)}
                  {...control}
                />
              )}
            </FormField>
          </div>
        </Grid>
      </FormSection>

      <FormSection legend="Datos institucionales">
        <Grid>
          <FormField label="Categoría" error={errors.category}>
            {(control) => (
              <Select
                value={values.category}
                onChange={(event) => onChange('category', event.target.value as PersonnelFormValues['category'])}
                {...control}
              >
                <option value="">Sin categoría</option>
                {RAV60_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_LABEL[category]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField label="Cargo" error={errors.cargo}>
            {(control) => <Input autoComplete="off" {...text('cargo')} {...control} />}
          </FormField>
          <FormField label="Dependencia" error={errors.dependencia}>
            {(control) => <Input autoComplete="off" {...text('dependencia')} {...control} />}
          </FormField>
          <FormField label="Grupo sanguíneo" error={errors.bloodType}>
            {(control) => (
              <Select
                value={values.bloodType}
                onChange={(event) => onChange('bloodType', event.target.value as PersonnelFormValues['bloodType'])}
                {...control}
              >
                <option value="">Sin registrar</option>
                {BLOOD_TYPES.map((bloodType) => (
                  <option key={bloodType} value={bloodType}>
                    {BLOOD_TYPE_LABEL[bloodType]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          {showStatus ? (
            <FormField label="Estatus institucional" error={errors.status}>
              {(control) => (
                <Select
                  value={values.status}
                  onChange={(event) => onChange('status', event.target.value as PersonnelFormValues['status'])}
                  {...control}
                >
                  {PERSONNEL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          ) : null}
        </Grid>
      </FormSection>

      <FormSection legend="Foto y firma" description="Se imprimen en la credencial del titular.">
        <div className={styles.images}>
          <ImageField
            label="Foto"
            shape="portrait"
            previewAlt="Vista previa de la foto"
            previewUrl={photoUrl}
            hint={IMAGE_HINT}
            error={errors.photo}
            onSelect={onPhoto}
          />
          <ImageField
            label="Firma"
            shape="wide"
            previewAlt="Vista previa de la firma"
            previewUrl={signatureUrl}
            hint={IMAGE_HINT}
            error={errors.signature}
            onSelect={onSignature}
          />
        </div>
      </FormSection>
    </>
  )
}
