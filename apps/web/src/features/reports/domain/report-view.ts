import type {
  BlockType,
  CredentialKind,
  Rav60Category,
  Rav67Class,
  ReportId,
  ReportStatus,
  Role,
  UserArea,
} from '@sryg/types'
import { canAccessReport, REPORTS } from '@sryg/types'
import type { LampStatus } from '../../../design-system'

export const REPORT_LABELS: Record<ReportId, { label: string; description: string }> = {
  vencimientos: { label: 'Vencimientos', description: 'Credenciales vencidas y próximas a vencer' },
  estado_consolidado: { label: 'Estado consolidado', description: 'Credenciales vigentes y peor estado por persona' },
  bloqueos_activos: { label: 'Bloqueos activos', description: 'Impedimentos sin resolver' },
}

/** The reports the user reaches, in catalog order (D10: Consulta only sees report 1). */
export function visibleReports(role: Role, area: UserArea): ReportId[] {
  return REPORTS.filter((r) => canAccessReport(role, area, r, 'read'))
}

/** Statuses each report can be filtered by; active blocks have none. */
export const STATUS_FILTERS: Record<ReportId, ReportStatus[]> = {
  vencimientos: ['vencida', 'proxima_a_vencer', 'bloqueada'],
  estado_consolidado: ['vigente', 'proxima_a_vencer', 'vencida', 'bloqueada', 'sin_credenciales'],
  bloqueos_activos: [],
}

/** What the date range applies to, per report. */
export const DATE_RANGE_LABELS: Record<ReportId, string> = {
  vencimientos: 'Vencimiento',
  estado_consolidado: 'Próximo vencimiento',
  bloqueos_activos: 'Registrado',
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  vigente: 'Vigente',
  proxima_a_vencer: 'Próxima a vencer',
  vencida: 'Vencida',
  bloqueada: 'Bloqueada',
  sin_credenciales: 'Sin credenciales',
}

const LAMPS: Record<ReportStatus, LampStatus> = {
  vigente: 'activa',
  proxima_a_vencer: 'proxima',
  vencida: 'vencida',
  bloqueada: 'bloqueada',
  sin_credenciales: 'sin-datos',
}
export const lampOf = (status: ReportStatus): LampStatus => LAMPS[status]

export const KIND_LABELS: Record<CredentialKind, string> = {
  licencia: 'Licencia',
  habilitacion_tipo: 'Habilitación de tipo',
  habilitacion_clase: 'Habilitación de clase',
  certificado_medico: 'Certificado médico',
}

export const RAV60_LABELS: Record<Rav60Category, string> = {
  piloto_transporte_linea: 'Piloto de transporte de línea',
  piloto_comercial: 'Piloto comercial',
  piloto_privado: 'Piloto privado',
  tripulante_cabina: 'Tripulante de cabina',
  tecnico_mantenimiento: 'Técnico de mantenimiento',
  controlador_transito_aereo: 'Controlador de tránsito aéreo',
}

export const RAV67_LABELS: Record<Rav67Class, string> = { clase_1: 'Clase 1', clase_2: 'Clase 2', clase_3: 'Clase 3' }

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  administrativo: 'Administrativo',
  medico: 'Médico',
  regulatorio: 'Regulatorio',
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "04 oct 2026" from `YYYY-MM-DD` or a full ISO datetime (UTC). */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-')
  return `${day} ${MONTHS[Number(month) - 1]} ${year}`
}

/** "04 oct 2026 · 14:05" (UTC). */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${iso.slice(11, 16)}`
}

/** "−10 d" / "5 d". */
export function formatRemaining(days: number): string {
  return days < 0 ? `−${Math.abs(days)} d` : `${days} d`
}
