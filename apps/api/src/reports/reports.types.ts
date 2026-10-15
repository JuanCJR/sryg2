import type { CsvReportRenderer } from './services/csv-report-renderer'
import type { PdfKitReportRenderer } from './services/pdfkit-report-renderer'

/** Turns a report table into a downloadable file; the export picks one by format. */
export type ReportFileRenderer = CsvReportRenderer | PdfKitReportRenderer
