import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// apps/api/assets, from both src/shared/pdf (tests) and dist/shared/pdf (build).
const ASSETS = join(__dirname, '..', '..', '..', 'assets')

/** The app's palette (docs/ui-conventions.md §5, apps/web tokens): INAC blue and the navy-tinted ramp. */
export const PDF_COLORS = {
  brand: '#04528A',
  ink: '#161A1E',
  muted: '#4D545B',
  rule: '#C9D1DB',
  band: '#F1F4F8',
  white: '#FFFFFF',
  red: '#D12F24',
  amber: '#F2A900',
  unlit: '#4D545B',
} as const

/** Font names registered by `useBrandFonts`: B612, the app's typeface, with Helvetica as fallback. */
export const PDF_FONTS = { regular: 'B612', bold: 'B612-Bold' } as const

export const LEGAL_NOTICE = `© ${new Date().getFullYear()} Instituto Nacional de Aeronáutica Civil (INAC). Todos los derechos reservados.`

let cache: { regular: Buffer; bold: Buffer; logo: Buffer } | null | undefined

function assets() {
  if (cache === undefined) {
    try {
      cache = {
        regular: readFileSync(join(ASSETS, 'fonts', 'b612-latin-400-normal.woff')),
        bold: readFileSync(join(ASSETS, 'fonts', 'b612-latin-700-normal.woff')),
        logo: readFileSync(join(ASSETS, 'inac-logo.png')),
      }
    } catch {
      // A deploy without the assets folder still renders, in Helvetica and without the logo.
      cache = null
    }
  }
  return cache
}

/** Registers B612 on the document; falls back to the built-in Helvetica when the files are missing. */
export function useBrandFonts(doc: PDFKit.PDFDocument): { regular: string; bold: string } {
  const files = assets()
  if (!files) return { regular: 'Helvetica', bold: 'Helvetica-Bold' }
  doc.registerFont(PDF_FONTS.regular, files.regular)
  doc.registerFont(PDF_FONTS.bold, files.bold)
  return PDF_FONTS
}

/** The official INAC logo (229 × 111 px), or null when it is not deployed. */
export const inacLogo = (): Buffer | null => assets()?.logo ?? null
