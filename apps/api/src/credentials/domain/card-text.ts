import type { BloodType, Rav67Class } from '@sryg/types'
import type { Bilingual } from './credential-card'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** `YYYY-MM-DD` as the real cards print it: `dd/Mmm/aaaa` (§4). A missing date prints as a dash. */
export function formatCardDate(iso: string | null): string {
  if (!iso) return '—'
  const [year, month, day] = iso.split('-')
  return `${day}/${MONTHS[Number(month) - 1]}/${year}`
}

/** "Español / English" for the bilingual card; the Spanish text alone when there is no distinct English one. */
export function bilingual({ es, en }: Bilingual): string {
  return en && en !== es ? `${es} / ${en}` : es
}

/** The vertical red label of the medical certificate front, in Spanish (§4). */
export const MEDICAL_CLASS_CARD_LABEL: Record<Rav67Class, string> = {
  clase_1: 'PRIMERA CLASE',
  clase_2: 'SEGUNDA CLASE',
  clase_3: 'TERCERA CLASE',
}

/** Its English twin, printed as a second column of stacked letters next to the Spanish one. */
export const MEDICAL_CLASS_CARD_LABEL_EN: Record<Rav67Class, string> = {
  clase_1: 'FIRST CLASS',
  clase_2: 'SECOND CLASS',
  clase_3: 'THIRD CLASS',
}

export const BLOOD_TYPE_CARD_LABEL: Record<BloodType, string> = {
  a_pos: 'A Rh (+)',
  a_neg: 'A Rh (-)',
  b_pos: 'B Rh (+)',
  b_neg: 'B Rh (-)',
  ab_pos: 'AB Rh (+)',
  ab_neg: 'AB Rh (-)',
  o_pos: 'O Rh (+)',
  o_neg: 'O Rh (-)',
}

/** What the QR encodes: the public page `/verificar/:token` of the web app (D9). */
export function verificationUrl(webOrigin: string, token: string): string {
  return `${webOrigin.replace(/\/+$/, '')}/verificar/${encodeURIComponent(token)}`
}

/**
 * The license types a medical certificate covers, as one sentence like the real card prints it:
 * "Controlador de tránsito aéreo, alumno controlador de tránsito aéreo y operador de estaciones aeronáuticas".
 */
export function licenseTypeSentence(types: Bilingual[]): string {
  const names = types.map(({ es }, i) => (i === 0 ? es : es.charAt(0).toLowerCase() + es.slice(1)))
  if (names.length < 2) return names.join('')
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}
