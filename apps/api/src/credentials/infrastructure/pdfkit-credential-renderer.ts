import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import {
  bilingual,
  BLOOD_TYPE_CARD_LABEL,
  formatCardDate,
  MEDICAL_CLASS_CARD_LABEL,
} from '../domain/card-text'
import type {
  CardHolder,
  CardImage,
  CardRenderContext,
  CredentialCard,
  CredentialCardRenderer,
  LicenseCard,
  MedicalCard,
} from '../domain/credential-card'

type Doc = PDFKit.PDFDocument

// CR80: 85.6 × 54 mm, in points (D7).
const MM = 72 / 25.4
const W = 85.6 * MM
const H = 54 * MM
const M = 6

const INK = '#111111'
const MUTED = '#6b6b6b'
const RED = '#c1121f'
const CELESTE = '#8ecae6'

const REGULAR = 'Helvetica'
const BOLD = 'Helvetica-Bold'
const ITALIC = 'Helvetica-Oblique'

const QR_SIZE = 52
const NONE = 'Ninguna / None'

const VALIDITY_TEXT =
  'Validez: Este certificado médico no es válido mientras su titular tenga una enfermedad o deficiencia (o aumento de una condición previamente declarada), que lo hagan incapaz de cumplir los requisitos exigidos en el mismo.'
const DRIVING_TEXT =
  'El presente certificado es válido para conducir los vehículos automotores. (Resolución MTC No. 137 de fecha 25-06-1977 gaceta oficial No 31.285 de fecha 28-07-1977)'

/**
 * Lays out the license and the medical certificate as the real INAC cards (§4 of the parallel
 * plan): a CR80 page for the front and another for the back. Missing graphic resources, photo or
 * signatures print a placeholder (D18).
 */
export class PdfKitCredentialRenderer implements CredentialCardRenderer {
  async render(card: CredentialCard, { resources, verificationUrl }: CardRenderContext): Promise<Buffer> {
    const qr = await QRCode.toBuffer(verificationUrl, { errorCorrectionLevel: 'M', margin: 1, width: 300 })
    const title = card.kind === 'license' ? 'Licencia' : 'Certificado médico'
    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      autoFirstPage: false,
      info: { Title: `${title} ${card.number}`, Author: 'SRYG · INAC' },
    })
    const done = new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    doc.addPage({ size: [W, H], margin: 0 })
    watermark(doc)
    header(doc, resources.logoInac)
    if (card.kind === 'license') licenseFront(doc, card)
    else medicalFront(doc, card)
    signatures(doc, resources.presidentSignature, card.holder)

    doc.addPage({ size: [W, H], margin: 0 })
    watermark(doc)
    if (card.kind === 'license') licenseBack(doc, card)
    else medicalBack(doc, card)
    qrCode(doc, qr)

    doc.end()
    return done
  }
}

/** One block of text, clipped to its box: the card never grows a third page. */
function put(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
  { font = REGULAR, size = 4.3, color = INK, lines = 1, align = 'left' as 'left' | 'center' | 'right' } = {},
): number {
  doc.font(font).fontSize(size).fillColor(color)
  const lineHeight = doc.currentLineHeight(true)
  const height = Math.min(doc.heightOfString(text, { width, lineGap: 0 }), lineHeight * lines)
  doc.text(text, x, y, { width, height: height + 0.1, lineGap: 0, ellipsis: true, align })
  return height
}

/** "Label: value" with the label in the muted tone. */
function field(doc: Doc, label: string, value: string, x: number, y: number, width: number, lines = 1): number {
  doc.font(REGULAR).fontSize(4.3)
  const lineHeight = doc.currentLineHeight(true)
  const text = `${label}: ${value}`
  const height = Math.min(doc.heightOfString(text, { width, lineGap: 0 }), lineHeight * lines)
  doc
    .fillColor(MUTED)
    .text(`${label}: `, x, y, { width, height: height + 0.1, lineGap: 0, ellipsis: true, continued: true })
    .font(BOLD)
    .fillColor(INK)
    .text(value, { lineGap: 0 })
  return height
}

/** The ICAO emblem is not a stored resource: a light celeste globe stands in for its watermark. */
function watermark(doc: Doc) {
  const cx = W / 2
  const cy = H / 2 + 8
  doc.save().opacity(0.18).lineWidth(0.8).strokeColor(CELESTE)
  doc.circle(cx, cy, 32).stroke()
  doc.ellipse(cx, cy, 14, 32).stroke()
  doc.ellipse(cx, cy, 26, 32).stroke()
  doc.moveTo(cx, cy - 32).lineTo(cx, cy + 32).stroke()
  for (const dy of [-20, 0, 20]) {
    const half = Math.sqrt(32 * 32 - dy * dy)
    doc.moveTo(cx - half, cy + dy).lineTo(cx + half, cy + dy).stroke()
  }
  doc.restore()
}

function placeholder(doc: Doc, label: string, x: number, y: number, w: number, h: number) {
  doc.save().lineWidth(0.4).dash(1.2, { space: 1.2 }).strokeColor(MUTED).rect(x, y, w, h).stroke().undash().restore()
  doc.font(BOLD).fontSize(3.4).fillColor(MUTED)
  const textHeight = doc.heightOfString(label, { width: w - 2 })
  doc.text(label, x + 1, y + (h - textHeight) / 2, { width: w - 2, align: 'center', lineGap: 0 })
}

/** Draws a stored PNG/JPEG fitted in its box, or the placeholder when it is absent or unreadable. */
function image(doc: Doc, img: CardImage | null, label: string, x: number, y: number, w: number, h: number) {
  if (img) {
    try {
      doc.image(img.data, x, y, { fit: [w, h], align: 'center', valign: 'center' })
      return
    } catch {
      // A corrupt or unsupported image prints the placeholder rather than failing the card.
    }
  }
  placeholder(doc, label, x, y, w, h)
}

/** The coat of arms is not a stored resource either: an outlined shield marks its place. */
function shield(doc: Doc, x: number, y: number, w: number, h: number) {
  doc
    .save()
    .lineWidth(0.6)
    .strokeColor(MUTED)
    .moveTo(x, y)
    .lineTo(x + w, y)
    .lineTo(x + w, y + h * 0.55)
    .quadraticCurveTo(x + w, y + h * 0.9, x + w / 2, y + h)
    .quadraticCurveTo(x, y + h * 0.9, x, y + h * 0.55)
    .closePath()
    .stroke()
    .restore()
}

function header(doc: Doc, logo: CardImage | null) {
  shield(doc, M + 2, 5, 18, 22)
  image(doc, logo, 'LOGO INAC', W - M - 22, 4, 22, 24)
  const x = M + 26
  const width = W - 2 * M - 52
  put(doc, 'REPÚBLICA BOLIVARIANA DE VENEZUELA', x, 6, width, { font: BOLD, size: 5.2, align: 'center' })
  put(doc, 'BOLIVARIAN REPUBLIC OF VENEZUELA', x, 12, width, { font: ITALIC, size: 4.4, align: 'center' })
  put(doc, 'VIII INSTITUTO NACIONAL DE AERONÁUTICA CIVIL', x, 18.5, width, { font: BOLD, size: 5, align: 'center' })
  doc.save().lineWidth(0.6).strokeColor(CELESTE).moveTo(M, 30).lineTo(W - M, 30).stroke().restore()
}

const fullName = (holder: CardHolder) => `${holder.firstNames} ${holder.lastNames}`

function licenseFront(doc: Doc, card: LicenseCard) {
  const { holder } = card
  image(doc, holder.photo, 'SIN FOTO', M, 34, 44, 56)

  const x = 56
  const width = W - M - x
  let y = 34
  y += put(doc, 'IX Capacitado para ejercer las atribuciones como:', x, y, width, { color: MUTED })
  y += put(doc, 'Qualified to exercise the privileges as:', x, y, width, { font: ITALIC, color: MUTED }) + 1.5
  y += put(doc, card.licenseType.es, x, y, width, { font: BOLD, size: 6.5, lines: 2 })
  if (card.licenseType.en) y += put(doc, card.licenseType.en, x, y, width, { font: ITALIC, size: 5.5, lines: 2 })
  y = Math.max(y + 3, 70)
  put(doc, 'IV Nombre (Name):', x, y, width, { color: MUTED })
  put(doc, fullName(holder), x, y + 5, width, { font: BOLD, size: 6.5, lines: 2 })

  const left = M
  const leftWidth = 116
  let fy = 93
  fy += field(doc, 'V Dirección (Adress)', holder.address ?? '—', left, fy, leftWidth, 2) + 1
  fy += field(doc, 'VI Nacionalidad (Nationality)', holder.nationality ? bilingual(holder.nationality) : '—', left, fy, leftWidth) + 1
  field(doc, 'IVa Fecha Nac. (Date of Birth)', formatCardDate(holder.birthDate), left, fy, leftWidth)

  const right = 126
  const rightWidth = W - M - right
  field(doc, 'III Licencia # (License)', card.number, right, 93, rightWidth)
  field(doc, 'X Fecha de Emisión (Date of issue)', formatCardDate(card.issueDate), right, 99, rightWidth)
}

function medicalFront(doc: Doc, card: MedicalCard) {
  const { holder } = card
  // Vertical red class label along the left edge, read bottom to top (§4).
  const bottom = H - M
  doc.save().rotate(-90, { origin: [M, bottom] })
  put(doc, MEDICAL_CLASS_CARD_LABEL[card.rav67Class], M, bottom, bottom - 34, {
    font: BOLD,
    size: 6.5,
    color: RED,
    align: 'center',
  })
  doc.restore()

  image(doc, holder.photo, 'SIN FOTO', M + 11, 34, 42, 54)

  const x = 60
  const width = W - M - x
  let y = 34
  y += put(doc, 'Certificado Médico Aeronáutico', x, y, width, { font: BOLD, size: 6.5 })
  y += put(doc, 'Aeronautical Medical Certificate', x, y, width, { font: ITALIC, size: 5.5 }) + 3
  y += put(doc, 'Nombre (Name):', x, y, width, { color: MUTED })
  y += put(doc, fullName(holder), x, y, width, { font: BOLD, size: 5.8, lines: 2 }) + 2
  y += field(doc, 'Número del certificado (Certificate number)', card.number, x, y, width) + 1.5
  y += field(
    doc,
    'Grupo sanguíneo y Rh (Blood type)',
    holder.bloodType ? BLOOD_TYPE_CARD_LABEL[holder.bloodType] : '—',
    x,
    y,
    width,
  ) + 1.5
  field(doc, 'Fecha de vencimiento (Expiry date)', formatCardDate(card.expiryDate), x, y, width)
}

function signatureBlock(doc: Doc, img: CardImage | null, label: string, x: number, width: number) {
  const top = 117
  image(doc, img, 'SIN FIRMA', x + width / 2 - 30, top, 60, 21)
  doc.save().lineWidth(0.4).strokeColor(INK).moveTo(x, top + 23).lineTo(x + width, top + 23).stroke().restore()
  put(doc, label, x, top + 24.5, width, { size: 3.9, color: MUTED, align: 'center', lines: 2 })
}

function signatures(doc: Doc, presidentSignature: CardImage | null, holder: CardHolder) {
  signatureBlock(doc, presidentSignature, 'X Presidente INAC', M + 10, 92)
  signatureBlock(doc, holder.signature, 'VII Firma del Titular (Holders signature)', W - M - 102, 92)
}

const BACK_WIDTH = W - 2 * M - QR_SIZE - 6

/** Writes a titled list below `y`, clipped at the bottom margin; returns the next free y. */
function section(doc: Doc, title: string, items: string[], y: number): number {
  const limit = H - M
  if (y >= limit) return y
  y += put(doc, title, M, y, BACK_WIDTH, { font: BOLD, size: 4.8 }) + 0.8
  for (const item of items.length ? items : [NONE]) {
    doc.font(REGULAR).fontSize(4.3)
    const lineHeight = doc.currentLineHeight(true)
    const room = Math.floor((limit - y) / lineHeight)
    if (room < 1) return limit
    y += put(doc, item, M + 3, y, BACK_WIDTH - 3, { lines: Math.min(2, room) }) + 0.6
  }
  return y + 2.5
}

function licenseBack(doc: Doc, card: LicenseCard) {
  let y = M
  y = section(
    doc,
    'Habilitaciones de tipo (Type ratings)',
    card.typeRatings.map(
      (r) => `${bilingual(r.aircraft)} · ${bilingual(r.function)} · Vence (Expiry): ${formatCardDate(r.expiryDate)}`,
    ),
    y,
  )
  y = section(
    doc,
    'Habilitaciones de clase (Class ratings)',
    card.classRatings.map(
      (r) =>
        `${bilingual(r.classRating)}${r.aircraft.length ? `: ${r.aircraft.map((a) => a.es).join(', ')}` : ''} · Vence (Expiry): ${formatCardDate(r.expiryDate)}`,
    ),
    y,
  )
  section(
    doc,
    'Observaciones (Remarks)',
    card.observations.map((o) => `• ${bilingual(o)}`),
    y,
  )
}

function medicalBack(doc: Doc, card: MedicalCard) {
  const restrictions = [...card.observations.map(bilingual), ...(card.restrictions ? [card.restrictions] : [])]
  let y = M
  y += field(doc, 'Restricciones / Observaciones', restrictions.length ? restrictions.join('; ') : NONE, M, y, BACK_WIDTH, 4) + 2.5

  // The legal texts always print whole; the list of license types takes the room left between them.
  doc.font(REGULAR).fontSize(3.9)
  const legalHeight =
    doc.heightOfString(VALIDITY_TEXT, { width: BACK_WIDTH, lineGap: 0 }) +
    doc.heightOfString(DRIVING_TEXT, { width: BACK_WIDTH, lineGap: 0 }) +
    2
  y += put(
    doc,
    'Este certificado médico es válido para el personal técnico aeronáutico que posean las licencias aeronáuticas siguientes:',
    M,
    y,
    BACK_WIDTH,
    { lines: 3 },
  ) + 0.8
  const types = card.validForLicenseTypes.length ? card.validForLicenseTypes.map(bilingual).join(' · ') : NONE
  doc.font(BOLD).fontSize(4.3)
  const lineHeight = doc.currentLineHeight(true)
  const room = Math.max(1, Math.floor((H - M - legalHeight - 2 - y) / lineHeight))
  y += put(doc, types, M, y, BACK_WIDTH, { font: BOLD, color: RED, lines: room }) + 2
  y = Math.max(y, H - M - legalHeight)
  y += put(doc, VALIDITY_TEXT, M, y, BACK_WIDTH, { size: 3.9, lines: 10 }) + 2
  put(doc, DRIVING_TEXT, M, y, BACK_WIDTH, { size: 3.9, lines: 10 })
}

function qrCode(doc: Doc, png: Buffer) {
  const x = W - M - QR_SIZE
  const y = (H - QR_SIZE) / 2 - 4
  doc.image(png, x, y, { width: QR_SIZE, height: QR_SIZE })
  put(doc, 'Verificación / Verification', x - 4, y + QR_SIZE + 1.5, QR_SIZE + 8, {
    size: 3.6,
    color: MUTED,
    align: 'center',
  })
}
