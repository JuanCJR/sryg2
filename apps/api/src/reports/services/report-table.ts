import type { BlockType, CredentialKind, Rav60Category, ReportId, ReportRowById, ReportStatus } from '@sryg/types'
import { RAV67_CLASS_LABELS } from './build-reports'

/** A report flattened for the file renderers: Spanish headers and one cell per column. */
export interface ReportTable {
  title: string
  columns: Array<{ header: string; /** Relative width in the PDF. */ weight: number }>
  rows: Array<Array<string | number>>
}

export const REPORT_TITLES: Record<ReportId, string> = {
  vencimientos: 'Credenciales vencidas y próximas a vencer',
  estado_consolidado: 'Estado consolidado por persona',
  bloqueos_activos: 'Bloqueos activos',
}

const KIND_LABELS: Record<CredentialKind, string> = {
  licencia: 'Licencia',
  habilitacion_tipo: 'Habilitación de tipo',
  habilitacion_clase: 'Habilitación de clase',
  certificado_medico: 'Certificado médico',
}

export const STATUS_LABELS: Record<ReportStatus, string> = {
  vigente: 'Vigente',
  proxima_a_vencer: 'Próxima a vencer',
  vencida: 'Vencida',
  bloqueada: 'Bloqueada',
  sin_credenciales: 'Sin credenciales',
}

export const RAV60_LABELS: Record<Rav60Category, string> = {
  piloto_transporte_linea: 'Piloto de transporte de línea',
  piloto_comercial: 'Piloto comercial',
  piloto_privado: 'Piloto privado',
  tripulante_cabina: 'Tripulante de cabina',
  tecnico_mantenimiento: 'Técnico de mantenimiento',
  controlador_transito_aereo: 'Controlador de tránsito aéreo',
}

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  administrativo: 'Administrativo',
  medico: 'Médico',
  regulatorio: 'Regulatorio',
}

/** `YYYY-MM-DD HH:mm` (UTC). */
const dateTime = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`

type TableBuilder<R extends ReportId> = (rows: ReportRowById[R][]) => Omit<ReportTable, 'title'>

const BUILDERS: { [R in ReportId]: TableBuilder<R> } = {
  vencimientos: (rows) => ({
    columns: [
      { header: 'Cédula', weight: 1 },
      { header: 'Nombre', weight: 2 },
      { header: 'Credencial', weight: 1.4 },
      { header: 'Descripción', weight: 2 },
      { header: 'Tipo de licencia', weight: 2 },
      { header: 'Categoría RAV 60', weight: 1.6 },
      { header: 'Número', weight: 1 },
      { header: 'Vencimiento', weight: 1 },
      { header: 'Días restantes', weight: 0.8 },
      { header: 'Estado', weight: 1.2 },
    ],
    rows: rows.map((r) => [
      r.cedula,
      r.fullName,
      KIND_LABELS[r.credentialKind],
      r.description,
      r.licenseTypeName ?? '',
      r.rav60Category ? RAV60_LABELS[r.rav60Category] : '',
      r.number ?? '',
      r.expiryDate,
      r.daysRemaining,
      STATUS_LABELS[r.status],
    ]),
  }),
  estado_consolidado: (rows) => ({
    columns: [
      { header: 'Cédula', weight: 1 },
      { header: 'Nombre', weight: 2 },
      { header: 'Licencias', weight: 3.4 },
      { header: 'Habilitaciones (vencidas / próximas / total)', weight: 1.4 },
      { header: 'Certificado médico', weight: 2.2 },
      { header: 'Bloqueos activos', weight: 0.8 },
      { header: 'Próximo vencimiento', weight: 1 },
      { header: 'Estado', weight: 1.2 },
    ],
    rows: rows.map((r) => [
      r.cedula,
      r.fullName,
      r.licenses
        .map((l) => `${l.licenseTypeName} (${l.expiryDate ?? 'sin vencimiento'}, ${STATUS_LABELS[l.status]})`)
        .join('; '),
      `${r.ratings.expired} / ${r.ratings.nearExpiry} / ${r.ratings.total}`,
      r.medical
        ? `${RAV67_CLASS_LABELS[r.medical.rav67Class]} (${r.medical.expiryDate}, ${STATUS_LABELS[r.medical.status]})`
        : '',
      r.activeBlocks,
      r.nextExpiryDate ?? '',
      STATUS_LABELS[r.status],
    ]),
  }),
  bloqueos_activos: (rows) => ({
    columns: [
      { header: 'Cédula', weight: 1 },
      { header: 'Nombre', weight: 2 },
      { header: 'Tipo', weight: 1.2 },
      { header: 'Motivo', weight: 4 },
      { header: 'Registrado', weight: 1.4 },
      { header: 'Registrado por', weight: 1.6 },
    ],
    rows: rows.map((r) => [
      r.cedula,
      r.fullName,
      BLOCK_TYPE_LABELS[r.type],
      r.reason,
      dateTime(r.createdAt),
      r.createdByName,
    ]),
  }),
}

export function toReportTable<R extends ReportId>(report: R, rows: ReportRowById[R][]): ReportTable {
  return { title: REPORT_TITLES[report], ...BUILDERS[report](rows) }
}
