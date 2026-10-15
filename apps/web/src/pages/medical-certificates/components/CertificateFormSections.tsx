import { PENDING_INAC_LABEL, RAV67_CLASSES, type MedicalCertificateDto } from '@sryg/types'
import { DateInput, FormField, Input, Radio, Select } from '../../../common/components'
import inputStyles from '../../../common/components/Input/Input.module.css'
import { FormSection } from '../../../common/components/FormSection/FormSection'
import clsx from '../../../common/utils/clsx'
import type { CertificateFormErrors, CertificateFormValues, FormMode } from '../utils/certificate-form'
import { isRav67Class } from '../utils/certificate-form'
import { formatDay } from '../utils/dates'
import { certificateName, CLASS_LABEL } from '../utils/labels'
import { ObservationsField } from './ObservationsField'
import styles from './CertificateForm.module.css'

export interface CertificateFormSectionsProps {
  certificates: MedicalCertificateDto[]
  values: CertificateFormValues
  errors: CertificateFormErrors
  expiry: { date: string; months: number; isPlaceholder: boolean } | null
  onModeChange: (mode: FormMode) => void
  onChange: (patch: Partial<CertificateFormValues>) => void
}

/** TRÁMITE, CERTIFICADO and OBSERVACIONES: administrative data only (BR-05, D8). */
export function CertificateFormSections({
  certificates,
  values,
  errors,
  expiry,
  onModeChange,
  onChange,
}: CertificateFormSectionsProps) {
  const renewing = values.mode !== 'new'
  return (
    <>
      {certificates.length > 0 ? (
        <FormSection legend="Trámite" description="Renueve un certificado existente o registre uno de otra clase.">
          <ul className={styles.modes}>
            {certificates.map((c) => (
              <li key={c.id}>
                <label className={styles.mode}>
                  <Radio name="mode" checked={values.mode === c.id} onChange={() => onModeChange(c.id)} />
                  <span>
                    Renovar · {certificateName(c)} · vence {formatDay(c.expiryDate)}
                  </span>
                </label>
              </li>
            ))}
            <li>
              <label className={styles.mode}>
                <Radio name="mode" checked={values.mode === 'new'} onChange={() => onModeChange('new')} />
                <span>Registrar un certificado nuevo</span>
              </label>
            </li>
          </ul>
        </FormSection>
      ) : null}

      <FormSection legend="Certificado">
        <div className={styles.grid}>
          <FormField
            label="Clase RAV 67"
            required
            error={errors.rav67Class}
            hint={renewing ? 'La renovación mantiene la clase.' : undefined}
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                value={values.rav67Class}
                disabled={renewing}
                onChange={(event) =>
                  onChange({ rav67Class: isRav67Class(event.target.value) ? event.target.value : '' })
                }
              >
                <option value="">Seleccione…</option>
                {RAV67_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {CLASS_LABEL[c]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
          <FormField
            label="Número del certificado"
            required
            error={errors.number}
            hint="Por defecto, el número de documento del titular."
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                value={values.number}
                onChange={(event) => onChange({ number: event.target.value })}
              />
            )}
          </FormField>
          <FormField label="Fecha de emisión" required error={errors.issueDate}>
            {(controlProps) => (
              <DateInput
                {...controlProps}
                value={values.issueDate}
                onChange={(event) => onChange({ issueDate: event.target.value })}
              />
            )}
          </FormField>
          <div className={styles.readonly}>
            <span className={styles.readonlyLabel}>Vencimiento</span>
            <span className={styles.readonlyValue} data-testid="expiry-preview">
              {expiry ? formatDay(expiry.date) : '—'}
              {expiry?.isPlaceholder ? <span className={styles.pending}>{PENDING_INAC_LABEL}</span> : null}
            </span>
            <span className={styles.hint}>
              {expiry
                ? `Se calcula con la vigencia de la clase: ${expiry.months} meses.`
                : 'Se calcula con la vigencia de la clase al elegir la clase y la fecha.'}
            </span>
          </div>
        </div>
      </FormSection>

      <FormSection
        legend="Observaciones y restricciones"
        description="Solo restricciones operacionales generales. No registre diagnósticos, antecedentes ni historia clínica."
      >
        <ObservationsField value={values.observations} onChange={(observations) => onChange({ observations })} />
        <FormField
          label="Restricciones"
          error={errors.restrictions}
          hint="Texto libre, opcional. Hasta 500 caracteres."
        >
          {(controlProps) => (
            <textarea
              {...controlProps}
              className={clsx(inputStyles.control, styles.textarea)}
              rows={3}
              value={values.restrictions}
              onChange={(event) => onChange({ restrictions: event.target.value })}
            />
          )}
        </FormField>
      </FormSection>
    </>
  )
}
