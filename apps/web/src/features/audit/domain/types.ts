/** One row of a person's audit trail, as the Historial page key shows it. */
export interface AuditEntry {
  id: string
  /** ISO datetime */
  fecha: string
  actor: string
  accion: string
  entidad: 'Personal' | 'Licencia' | 'Habilitación' | 'Certificado médico' | 'Bloqueo'
  detalle: string
}
