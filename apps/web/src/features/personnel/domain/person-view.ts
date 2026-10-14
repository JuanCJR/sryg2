import type { BloodType, PersonnelDto, PersonnelStatus, Rav60Category } from '@sryg/types'
import { formatDate } from './format'
import type { Person, PersonnelListRow } from './types'

const MISSING = '—'

export const CATEGORY_LABEL: Record<Rav60Category, string> = {
  piloto_transporte_linea: 'Piloto de transporte de línea',
  piloto_comercial: 'Piloto comercial',
  piloto_privado: 'Piloto privado',
  tripulante_cabina: 'Tripulante de cabina',
  tecnico_mantenimiento: 'Técnico de mantenimiento',
  controlador_transito_aereo: 'Controlador de tránsito aéreo',
}

const BLOOD_TYPE_LABEL: Record<BloodType, string> = {
  a_pos: 'A+',
  a_neg: 'A−',
  b_pos: 'B+',
  b_neg: 'B−',
  ab_pos: 'AB+',
  ab_neg: 'AB−',
  o_pos: 'O+',
  o_neg: 'O−',
}

const STATUS_LABEL: Record<PersonnelStatus, string> = { activo: 'Activo', inactivo: 'Inactivo' }

const orMissing = (value: string | null) => (value && value.trim() ? value : MISSING)

export function fullName(dto: Pick<PersonnelDto, 'firstNames' | 'lastNames'>): string {
  return `${dto.firstNames} ${dto.lastNames}`.trim()
}

/** Maps the API record (F0-A fields, D21) to the labels the Expediente shows. */
export function toPersonView(dto: PersonnelDto): Person {
  return {
    id: dto.id,
    cedula: dto.cedula,
    nombre: fullName(dto),
    nombres: dto.firstNames,
    apellidos: dto.lastNames,
    categoria: dto.category ? CATEGORY_LABEL[dto.category] : MISSING,
    tipoSangre: dto.bloodType ? BLOOD_TYPE_LABEL[dto.bloodType] : MISSING,
    fechaNacimiento: dto.birthDate ? formatDate(dto.birthDate) : MISSING,
    direccion: orMissing(dto.address),
    cargo: orMissing(dto.cargo),
    dependencia: orMissing(dto.dependencia),
    estatusInstitucional: STATUS_LABEL[dto.status],
    email: orMissing(dto.email),
    telefono: orMissing(dto.phone),
  }
}

export function toListRow(dto: PersonnelDto): PersonnelListRow {
  return {
    id: dto.id,
    cedula: dto.cedula,
    nombre: fullName(dto),
    categoria: dto.category ? CATEGORY_LABEL[dto.category] : MISSING,
    estado: null,
    diasRestantes: null,
    credencialCritica: null,
  }
}
