import type { Rav67Class } from '@sryg/types'
import type { LicenseTypeValidity } from '../../common/credentials/dtos/validity-parameters.dto'
import { ConflictError } from '../../common/errors/domain-errors'

/** Audit entity names: the tables the rows live in. */
export const LICENSE_ENTITY = 'licencia'
export const TYPE_RATING_ENTITY = 'habilitacion_tipo'
export const CLASS_RATING_ENTITY = 'habilitacion_clase'

/** The user performing a mutation; access was already checked by the permission guard. */
export interface Actor {
  id: string
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * `YYYY-MM-DD` plus whole calendar months. A day that does not exist in the target month falls on
 * that month's last day (31 Jan + 1 month = 28/29 Feb), so a license never outlives its validity.
 */
export function addMonths(isoDate: string, months: number): string {
  const match = ISO_DATE.exec(isoDate)
  if (!match) throw new RangeError(`Invalid date: ${isoDate}`)
  const [, y, m, d] = match
  const monthIndex = Number(y) * 12 + (Number(m) - 1) + months
  const year = Math.floor(monthIndex / 12)
  const month = monthIndex % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(Number(d), lastDay)
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Expiry of a license issued on `issueDate` (D20): null when its type does not apply expiry;
 * otherwise the type's `validity_months` (D3, never a hardcoded number, BR-02) after the issue date.
 */
export function computeLicenseExpiry(issueDate: string, validity: LicenseTypeValidity): string | null {
  if (!validity.appliesExpiry) return null
  if (validity.validityMonths === null) {
    throw new ConflictError('El tipo de licencia no tiene vigencia configurada. Configúrela en el catálogo.')
  }
  return addMonths(issueDate, validity.validityMonths)
}

/** Valid on `today` (both `YYYY-MM-DD`): no expiry, or it expires today or later. */
export const isValidOn = (expiryDate: string | null, today: string) => expiryDate === null || expiryDate >= today

const CLASS_LABEL: Record<Rav67Class, string> = { clase_1: 'clase 1', clase_2: 'clase 2', clase_3: 'clase 3' }

export const BLOCKED_MESSAGE =
  'La persona tiene un bloqueo activo (BR-07). Resuélvalo desde el expediente antes de emitir o renovar.'

export function missingMedicalCertificateMessage(licenseTypeName: string, requiredClass: Rav67Class): string {
  return `${licenseTypeName} exige un certificado médico vigente de ${CLASS_LABEL[requiredClass]} (D13), y la persona no lo tiene.`
}

export function ratingNeedsValidLicenseMessage(licenseExpiry: string): string {
  return `Una habilitación requiere una licencia vigente (D13): la licencia venció el ${licenseExpiry}. Renuévela primero.`
}
