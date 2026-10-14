// Value tuples shared by the API contracts (zod) and the database enums (@sryg/db).
export const ROLES = ['administrador', 'supervisor', 'consulta'] as const
// Area of a user (D24): a Supervisor writes only in theirs; the Admin is not restricted.
export const USER_AREAS = ['licencias', 'medicina', 'ambas'] as const
// `proxima_a_vencer` is derived from expiry and a configurable threshold (BR-12), never persisted.
export const CREDENTIAL_STATUSES = ['activa', 'vencida', 'bloqueada'] as const
// Status shown to users, always derived by `deriveCredentialStatus` (D17, BR-12).
export const DERIVED_CREDENTIAL_STATUSES = ['vigente', 'proxima_a_vencer', 'vencida', 'bloqueada'] as const
export const RAV60_CATEGORIES = [
  'piloto_transporte_linea',
  'piloto_comercial',
  'piloto_privado',
  'tripulante_cabina',
  'tecnico_mantenimiento',
  'controlador_transito_aereo',
] as const
export const RAV67_CLASSES = ['clase_1', 'clase_2', 'clase_3'] as const
export const PERSONNEL_STATUSES = ['activo', 'inactivo'] as const
export const BLOOD_TYPES = ['a_pos', 'a_neg', 'b_pos', 'b_neg', 'ab_pos', 'ab_neg', 'o_pos', 'o_neg'] as const
export const BLOCK_TYPES = ['administrativo', 'medico', 'regulatorio'] as const
export const BLOCK_STATUSES = ['activo', 'resuelto'] as const
export const AUDIT_ACTIONS = [
  'crear',
  'actualizar',
  'eliminar',
  'autenticar',
  'emitir',
  'renovar',
  'bloquear',
  'resolver',
  'reconocer',
  'exportar',
  'restablecer_contrasena',
  'adjuntar',
] as const
// Credentials that can expire and raise alerts (alerta.credential_kind).
export const CREDENTIAL_KINDS = ['licencia', 'habilitacion_tipo', 'habilitacion_clase', 'certificado_medico'] as const
export const ALERT_KINDS = ['vencida', 'proxima'] as const
export const GRAPHIC_RESOURCE_KINDS = ['logo_inac', 'firma_presidente'] as const

export type Role = (typeof ROLES)[number]
export type UserArea = (typeof USER_AREAS)[number]
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number]
export type DerivedCredentialStatus = (typeof DERIVED_CREDENTIAL_STATUSES)[number]
export type Rav60Category = (typeof RAV60_CATEGORIES)[number]
export type Rav67Class = (typeof RAV67_CLASSES)[number]
export type PersonnelStatus = (typeof PERSONNEL_STATUSES)[number]
export type BloodType = (typeof BLOOD_TYPES)[number]
export type BlockType = (typeof BLOCK_TYPES)[number]
export type BlockStatus = (typeof BLOCK_STATUSES)[number]
export type AuditAction = (typeof AUDIT_ACTIONS)[number]
export type CredentialKind = (typeof CREDENTIAL_KINDS)[number]
export type AlertKind = (typeof ALERT_KINDS)[number]
export type GraphicResourceKind = (typeof GRAPHIC_RESOURCE_KINDS)[number]
