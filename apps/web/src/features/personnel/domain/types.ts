import type { CredentialStatus } from '../../../design-system'

/** The person as the Expediente header and the Datos page key show it (labels already resolved). */
export interface Person {
  id: string
  cedula: string
  nombre: string
  nombres: string
  apellidos: string
  categoria: string
  tipoSangre: string
  fechaNacimiento: string
  direccion: string
  cargo: string
  dependencia: string
  estatusInstitucional: string
  email: string
  telefono: string
  fotoUrl?: string
}

/** One row of the Listado de personal. */
export interface PersonnelListRow {
  id: string
  cedula: string
  nombre: string
  categoria: string
  /**
   * Worst credential status of the person, its days remaining and which credential drives it.
   * Null until the API exposes a per-person credential summary (licenses W1-5, medical W1-6).
   */
  estado: CredentialStatus | null
  diasRestantes: number | null
  credencialCritica: string | null
}
