import type { AuditAction } from '@sryg/types'

export const ACTION_LABELS: Record<AuditAction, string> = {
  crear: 'Crear',
  actualizar: 'Actualizar',
  eliminar: 'Eliminar',
  autenticar: 'Autenticar',
  emitir: 'Emitir',
  renovar: 'Renovar',
  bloquear: 'Bloquear',
  resolver: 'Resolver',
  reconocer: 'Reconocer',
  exportar: 'Exportar',
  restablecer_contrasena: 'Restablecer contraseña',
  adjuntar: 'Adjuntar',
}

/**
 * Entities the trail names (the table each module writes), in filter order. An entity missing from
 * this list still shows, under its raw name.
 */
export const ENTITY_LABELS: Record<string, string> = {
  personal_aeronautico: 'Personal',
  personal_adjunto: 'Documento adjunto',
  licencia: 'Licencia',
  habilitacion_tipo: 'Habilitación de tipo',
  habilitacion_clase: 'Habilitación de clase',
  certificado_medico: 'Certificado médico',
  bloqueo: 'Bloqueo',
  alerta: 'Alerta',
  usuario: 'Usuario',
  parametro_sistema: 'Parámetro',
  recurso_grafico: 'Recurso gráfico',
}

export const entityLabel = (entity: string) => ENTITY_LABELS[entity] ?? entity
