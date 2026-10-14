import type { CredentialStatus } from '../../../design-system'

export type PageKeyId = 'datos' | 'licencias' | 'habilitaciones' | 'medico' | 'bloqueos' | 'historial'

export interface Person {
  id: string
  cedula: string
  nombre: string
  categoria: string
  ratingLabel: string
  tipoSangre: string
  cargo: string
  dependencia: string
  estatusInstitucional: string
  email: string
  telefono: string
  fotoUrl?: string
}

export interface Licencia {
  id: string
  tipo: string
  numero: string
  /** ISO date */
  emitida: string
  /** ISO date */
  vence: string
  /** Status ignoring any open block. */
  ownStatus: CredentialStatus
  /** Id of the open block stopping this licence, if any. */
  bloqueadaPorId?: string
}

export interface Habilitacion {
  id: string
  licenciaId: string
  nombre: string
  emitida: string
  vence: string
  ownStatus: CredentialStatus
  bloqueadaPorId?: string
}

export interface CertificadoMedico {
  id: string
  /** e.g. "RAV 67" — the norm under which the class is issued. */
  norma: string
  /** e.g. "Clase 1" */
  tipo: string
  emitida: string
  vence: string
  ownStatus: CredentialStatus
  restriccion: string
}

export interface Bloqueo {
  id: string
  tipo: string
  motivo: string
  /** ISO date */
  registradoEn: string
  registradoPor: string
  resueltoEn?: string
  resueltoPor?: string
  estado: 'abierto' | 'resuelto'
  /** Ids of the licences this block stops; their ratings inherit the stop. */
  detieneLicenciaIds: string[]
}

export interface AuditEntry {
  id: string
  /** ISO datetime */
  fecha: string
  actor: string
  accion: string
  entidad: 'Personal' | 'Licencia' | 'Habilitación' | 'Certificado médico' | 'Bloqueo'
  detalle: string
}

export interface ExpedienteData {
  person: Person
  licencia: Licencia
  habilitaciones: Habilitacion[]
  certificado: CertificadoMedico
  bloqueos: Bloqueo[]
  historial: AuditEntry[]
}

/** One row of the Listado de personal — the annunciator/table's unit, not the full Expediente. */
export interface PersonnelListRow {
  id: string
  cedula: string
  nombre: string
  categoria: string
  /** Worst/effective credential status across this person's licencia, habilitaciones, and certificado. */
  estado: CredentialStatus
  /** Days remaining (negative if overdue) for the credential driving `estado`. */
  diasRestantes: number
  /** Which credential drives `estado`, e.g. "Licencia — Piloto comercial". Desktop-only column. */
  credencialCritica: string
}

export interface Warning {
  id: string
  status: CredentialStatus
  title: string
  detail: string
  page: PageKeyId
  /** e.g. "hace 12 d", "21 d" — pre-formatted, flush-right, mono. */
  relativeLabel: string
  /** Row ids (licencia/habilitación/certificado) this warning should highlight on its page. */
  linkedRowIds: string[]
  /** Sort key within the same status priority — days until due (negative if overdue). */
  daysUntilDue: number
}
