// Contracts of the reports module (W1-8). The three v1 reports of D10.
export const REPORTS = ['vencimientos', 'estado_consolidado', 'bloqueos_activos'] as const
export type ReportId = (typeof REPORTS)[number]
export const REPORT_EXPORT_FORMATS = ['csv', 'pdf'] as const
export type ReportExportFormat = (typeof REPORT_EXPORT_FORMATS)[number]
