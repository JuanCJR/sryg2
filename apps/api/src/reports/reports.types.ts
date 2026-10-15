import type { PdfKitReportRenderer } from './services/pdfkit-report-renderer'
import type { XlsxReportRenderer } from './services/xlsx-report-renderer'

/** Turns a report table into a downloadable file; the export picks one by format. */
export type ReportFileRenderer = XlsxReportRenderer | PdfKitReportRenderer
