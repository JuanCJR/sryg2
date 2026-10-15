import {
  medicalExpiryDate,
  RAV67_CLASSES,
  type CatalogOption,
  type MedicalCertificateDto,
  type MedicalValidityDto,
  type Rav67Class,
  type RegisterMedicalCertificateInput,
  type RenewMedicalCertificateInput,
} from '@sryg/types'
import { isIsoDay } from './dates'

/** `new` registers a certificate; otherwise the id of the certificate being renewed. */
export type FormMode = 'new' | string

export interface CertificateFormValues {
  mode: FormMode
  rav67Class: Rav67Class | ''
  number: string
  issueDate: string
  observations: CatalogOption[]
  restrictions: string
}

export type CertificateFormErrors = Partial<Record<'rav67Class' | 'number' | 'issueDate' | 'restrictions', string>>

const RESTRICTIONS_MAX = 500

export const isRav67Class = (value: string): value is Rav67Class => (RAV67_CLASSES as readonly string[]).includes(value)

/** Values for a mode: a renewal starts from the certificate; a registration from the document (D22). */
export function valuesFor(
  mode: FormMode,
  certificates: MedicalCertificateDto[],
  documentNumber: string,
  today: string,
): CertificateFormValues {
  const renewing = certificates.find((c) => c.id === mode)
  if (!renewing) {
    return { mode: 'new', rav67Class: '', number: documentNumber, issueDate: today, observations: [], restrictions: '' }
  }
  return {
    mode: renewing.id,
    rav67Class: renewing.rav67Class,
    number: renewing.number,
    issueDate: today,
    observations: renewing.observations,
    restrictions: renewing.restrictions ?? '',
  }
}

export function validate(values: CertificateFormValues): CertificateFormErrors {
  const errors: CertificateFormErrors = {}
  if (!values.rav67Class) errors.rav67Class = 'Seleccione la clase RAV 67.'
  if (!values.number.trim()) errors.number = 'Ingrese el número del certificado.'
  if (!values.issueDate) errors.issueDate = 'Ingrese la fecha de emisión.'
  else if (!isIsoDay(values.issueDate)) errors.issueDate = 'Ingrese una fecha válida.'
  if (values.restrictions.trim().length > RESTRICTIONS_MAX)
    errors.restrictions = `Use ${RESTRICTIONS_MAX} caracteres como máximo.`
  return errors
}

/** The expiry the API will derive (D3), or null while the class or the date is missing. */
export function previewExpiry(values: CertificateFormValues, validity: MedicalValidityDto) {
  if (!values.rav67Class || !isIsoDay(values.issueDate)) return null
  const months = validity[values.rav67Class]
  return {
    date: medicalExpiryDate(values.issueDate, months.value),
    months: months.value,
    isPlaceholder: months.isPlaceholder,
  }
}

const common = (values: CertificateFormValues) => ({
  number: values.number.trim(),
  issueDate: values.issueDate,
  observationIds: values.observations.map((o) => o.id),
  restrictions: values.restrictions.trim() || null,
})

export function toRegisterBody(values: CertificateFormValues): RegisterMedicalCertificateInput {
  return { rav67Class: values.rav67Class as Rav67Class, ...common(values) }
}

export function toRenewBody(values: CertificateFormValues): RenewMedicalCertificateInput {
  return common(values)
}
