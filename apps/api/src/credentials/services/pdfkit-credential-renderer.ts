import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import type {
  CardHolder,
  CardImage,
  CardRenderContext,
  CredentialCard,
  LicenseCard,
  MedicalCard,
} from '../dtos/credential-card.dto'
import {
  bilingual,
  BLOOD_TYPE_CARD_LABEL,
  formatCardDate,
  licenseTypeSentence,
  MEDICAL_CLASS_CARD_LABEL,
  MEDICAL_CLASS_CARD_LABEL_EN,
} from './card-text'

type Doc = PDFKit.PDFDocument

// CR80: 85.6 × 54 mm, in points (D7).
const MM = 72 / 25.4
const W = 85.6 * MM
const H = 54 * MM

// The layout is measured on the real cards as fractions of their width and height (§4).
const X = (fraction: number) => fraction * W
const Y = (fraction: number) => fraction * H

const INK = '#111111'
const MUTED = '#6b6b6b'
const RED = '#d0312d'

const REGULAR = 'Helvetica'
const BOLD = 'Helvetica-Bold'
// Helvetica's cap height and ascender (718/1000): the top of a line sits on its capitals.
const CAP = 0.718

const NONE = 'Ninguna / None'

// Fixed artwork every card carries (apps/api/assets/credentials): the coat of arms, the ICAO
// emblem printed as a watermark, and the INAC logo used while the Admin has not uploaded one (D18).
// `assets/` sits three levels above both src/credentials/services and dist/credentials/services.
const ASSETS = join(__dirname, '..', '..', '..', 'assets', 'credentials')
let artwork: { coatOfArms: Buffer; icaoEmblem: Buffer; logoInac: CardImage } | undefined
function loadArtwork() {
  artwork ??= {
    coatOfArms: readFileSync(join(ASSETS, 'escudo-venezuela.png')),
    icaoEmblem: readFileSync(join(ASSETS, 'emblema-oaci.png')),
    logoInac: { data: readFileSync(join(ASSETS, 'logo-inac.png')), mime: 'image/png' },
  }
  return artwork
}

const VALIDITY_TEXT =
  'Validez: Este certificado médico no es válido mientras su titular tenga una enfermedad o deficiencia (o aumento de una condición previamente declarada), que lo hagan incapaz de cumplir los requisitos exigidos en el mismo.'
const DRIVING_TEXT =
  'El presente certificado es válido para conducir los vehículos automotores. (Resolución MTC No. 137 de fecha 25-06-1977 gaceta oficial No 31.285 de fecha 28-07-1977)'

/**
 * Lays out the license and the medical certificate as the real INAC cards (§4 of the parallel
 * plan): a CR80 page for the front and another for the back, with every block where the real card
 * has it. Missing graphic resources, photo or signatures print a placeholder (D18).
 */
export class PdfKitCredentialRenderer {
  async render(card: CredentialCard, { resources, verificationUrl }: CardRenderContext): Promise<Buffer> {
    const art = loadArtwork()
    const logo = resources.logoInac ?? art.logoInac
    const qr = await QRCode.toBuffer(verificationUrl, { errorCorrectionLevel: 'M', margin: 0, width: 300 })
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
    if (card.kind === 'license') {
      emblem(doc, art.icaoEmblem, X(0.485), Y(0.56), X(0.46), 0.7)
      header(doc, art.coatOfArms, logo, LICENSE_HEADER)
      licenseFront(doc, card)
      signatures(doc, resources.presidentSignature, card.holder, LICENSE_SIGNATURES)
    } else {
      emblem(doc, art.icaoEmblem, X(0.47), Y(0.5), X(0.46), 0.3)
      header(doc, art.coatOfArms, logo, MEDICAL_HEADER)
      medicalFront(doc, card)
      signatures(doc, resources.presidentSignature, card.holder, MEDICAL_SIGNATURES)
    }

    doc.addPage({ size: [W, H], margin: 0 })
    if (card.kind === 'license') {
      emblem(doc, art.icaoEmblem, X(0.48), Y(0.535), X(0.5), 0.9)
      licenseBack(doc, card, logo)
      doc.image(qr, X(0.758), Y(0.66), { width: 48, height: 48 })
    } else {
      emblem(doc, art.icaoEmblem, X(0.45), Y(0.42), X(0.5), 0.25)
      medicalBack(doc, card)
      doc.image(qr, X(0.695), Y(0.635), { width: 47, height: 47 })
    }

    doc.end()
    return done
  }
}

interface TextOptions {
  font?: string
  size?: number
  color?: string
  /** Width of the box; the text wraps inside it (clipped to `lines`) or shrinks to fit it (`fit`). */
  width?: number
  lines?: number
  align?: 'left' | 'center' | 'right' | 'justify'
  lineGap?: number
  /** Shrinks the font down to this size before clipping a single line that does not fit. */
  fit?: number
}

/** One block of text whose capitals start at `y`, clipped to its box; returns its height. */
function put(doc: Doc, text: string, x: number, y: number, options: TextOptions = {}): number {
  const { font = REGULAR, color = INK, lines = 1, align = 'left', lineGap = 0, fit } = options
  let size = options.size ?? 6.4
  const width = options.width ?? W - x
  doc.font(font).fontSize(size)
  if (fit) {
    while (size > fit && doc.widthOfString(text) > width) doc.fontSize((size -= 0.1))
  }
  doc.fillColor(color)
  const lineHeight = doc.currentLineHeight(true) + lineGap
  const full = doc.heightOfString(text, { width, lineGap })
  if (full <= lineHeight * lines + 0.5) {
    doc.text(text, x, y, { width, lineGap, align })
    return full
  }
  // Too long for its box: pdfkit clips and ends the last line with an ellipsis. It checks the room
  // for a line without a negative gap, so allow for it.
  const height = lineHeight * lines
  doc.text(text, x, y, { width, height: height + Math.max(0, -lineGap) + 0.1, lineGap, ellipsis: true, align })
  return height
}

/** A big label followed, on the same baseline, by its small English translation. */
function labelled(
  doc: Doc,
  label: string,
  size: number,
  note: string,
  noteSize: number,
  x: number,
  y: number,
  font = BOLD,
) {
  doc.font(font).fontSize(size)
  const end = x + doc.widthOfString(`${label} `)
  put(doc, label, x, y, { font, size })
  put(doc, note, end, y + CAP * (size - noteSize), { font, size: noteSize })
}

// Where the globe's center sits in emblema-oaci.png, as fractions of its width and height.
const EMBLEM_CENTER = [0.497, 0.48] as const
const EMBLEM_RATIO = 601 / 738

/** The ICAO emblem as a translucent watermark, `width` being its wingspan, centered on its globe. */
function emblem(doc: Doc, png: Buffer, cx: number, cy: number, width: number, opacity: number) {
  const height = width * EMBLEM_RATIO
  doc.save().opacity(opacity)
  doc.image(png, cx - EMBLEM_CENTER[0] * width, cy - EMBLEM_CENTER[1] * height, { width, height })
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

interface HeaderLayout {
  lines: [string, string, string]
  sizes: [number, number, number]
  tops: [number, number, number]
  /** Horizontal band the three lines are centered in. */
  from: number
  to: number
  coatOfArms: [number, number, number, number]
  logo: [number, number]
}

const LICENSE_HEADER: HeaderLayout = {
  lines: [
    'I REPÚBLICA BOLIVARIANA DE VENEZUELA',
    'BOLIVARIAN REPUBLIC OF VENEZUELA',
    'VIII INSTITUTO NACIONAL DE AERONÁUTICA CIVIL',
  ],
  sizes: [8.9, 7.7, 7.7],
  tops: [Y(0.03), Y(0.078), Y(0.118)],
  from: X(0.075),
  to: X(0.86),
  coatOfArms: [X(0.004), Y(0.02), 17, 18],
  logo: [X(0.86), Y(0.035)],
}

const MEDICAL_HEADER: HeaderLayout = {
  lines: [
    'REPÚBLICA BOLIVARIANA DE VENEZUELA',
    'BOLIVARIAN REPUBLIC OF VENEZUELA',
    'INSTITUTO NACIONAL DE AERONÁUTICA CIVIL',
  ],
  sizes: [8.6, 7.6, 7.6],
  tops: [Y(0.035), Y(0.081), Y(0.124)],
  from: X(0.12),
  to: X(0.86),
  coatOfArms: [X(0.045), Y(0.025), 17, 19],
  logo: [X(0.87), Y(0.04)],
}

function header(doc: Doc, coatOfArms: Buffer, logo: CardImage, layout: HeaderLayout) {
  const [x, y, w, h] = layout.coatOfArms
  doc.image(coatOfArms, x, y, { fit: [w, h], align: 'center', valign: 'center' })
  image(doc, logo, 'LOGO INAC', layout.logo[0], layout.logo[1], 28, 15)
  layout.lines.forEach((line, i) => {
    put(doc, line, layout.from, layout.tops[i]!, {
      font: BOLD,
      size: layout.sizes[i],
      width: layout.to - layout.from,
      align: 'center',
      fit: 5,
    })
  })
}

const fullName = (holder: CardHolder) => `${holder.firstNames} ${holder.lastNames}`

function licenseFront(doc: Doc, card: LicenseCard) {
  const { holder } = card
  image(doc, holder.photo, 'SIN FOTO', X(0.065), Y(0.195), X(0.195), Y(0.375))

  const x = X(0.295)
  const width = W - x - 6
  put(doc, 'IX Capacitado para ejercer las atribuciones como:', x, Y(0.185), { size: 6.4, width, fit: 4 })
  put(doc, 'Qualified to exercise the privileges as:', x, Y(0.228), { size: 6.4, width, fit: 4 })
  put(doc, `II ${card.licenseType.es}`, x, Y(0.29), { size: 7.5, width, fit: 5 })
  if (card.licenseType.en) put(doc, card.licenseType.en, x, Y(0.345), { size: 6.6, width, fit: 4.5 })
  put(doc, 'IV Nombre (Name):', x, Y(0.415), { size: 6 })
  put(doc, fullName(holder), x, Y(0.45), { font: BOLD, size: 8, width, fit: 6.5, lines: 2 })

  // Three labels side by side, each with its value underneath.
  const labels = Y(0.605)
  const values = Y(0.66)
  labelled(doc, 'V Dirección', 8.4, '(Adress)', 4.2, X(0.02), labels)
  put(doc, holder.address ?? '—', X(0.04), values, { size: 6.4, width: X(0.23), fit: 4 })
  labelled(doc, 'VI Nacionalidad:', 7.3, '(Nationality)', 4, X(0.295), labels)
  put(doc, holder.nationality?.es ?? '—', X(0.29), values, { size: 6.4, width: X(0.36), fit: 4 })
  labelled(doc, 'IVa Fecha Nac.', 6.6, '(Date of Birth)', 3.6, X(0.665), labels)
  put(doc, formatCardDate(holder.birthDate), X(0.665), values, { size: 6.4 })

  put(doc, 'III Licencia # (License):', X(0.025), Y(0.7), { size: 6.4 })
  put(doc, card.number, X(0.31), Y(0.7) - CAP * 1.8, { font: BOLD, size: 8.2 })
  put(doc, 'X Fecha de Emisión (Date of issue):', X(0.025), Y(0.745), { size: 6.4 })
  put(doc, formatCardDate(card.issueDate), X(0.475), Y(0.745) - CAP * 1.8, { font: BOLD, size: 8.2 })
}

/** One column of upright letters, read top to bottom, with a wider gap between words. */
function stackedLetters(doc: Doc, text: string, cx: number, top: number, step: number, wordGap: number) {
  doc.font(REGULAR).fontSize(6.6).fillColor(RED)
  let y = top
  for (const word of text.split(' ')) {
    for (const letter of word) {
      doc.text(letter, cx - doc.widthOfString(letter) / 2, y, { lineBreak: false })
      y += step
    }
    y += step * (wordGap - 1)
  }
}

function medicalFront(doc: Doc, card: MedicalCard) {
  const { holder } = card
  stackedLetters(doc, MEDICAL_CLASS_CARD_LABEL[card.rav67Class], X(0.06), Y(0.165), Y(0.058), 1.9)
  stackedLetters(doc, MEDICAL_CLASS_CARD_LABEL_EN[card.rav67Class], X(0.105), Y(0.265), Y(0.053), 2.3)

  image(doc, holder.photo, 'SIN FOTO', X(0.135), Y(0.18), X(0.155), Y(0.35))

  const center = X(0.335)
  const centerWidth = X(0.52)
  put(doc, 'Certificado Médico Aeronáutico', center, Y(0.19), {
    font: BOLD,
    size: 8,
    width: centerWidth,
    align: 'center',
  })
  put(doc, 'Aeronautical Medical Certificate', center, Y(0.233), {
    font: BOLD,
    size: 6.9,
    width: centerWidth,
    align: 'center',
  })

  const x = X(0.33)
  const width = W - x - 6
  put(doc, 'Nombre (Name):', x, Y(0.3), { size: 6.5 })
  put(doc, fullName(holder), x, Y(0.345), { size: 7.4, width, fit: 5 })
  const bloodType = holder.bloodType ? BLOOD_TYPE_CARD_LABEL[holder.bloodType] : '—'
  const rows: Array<[string, string, number]> = [
    [`Número del certificado: ${card.number}`, 'Certificate number', Y(0.425)],
    [`Grupo sanguíneo y Rh: ${bloodType}`, 'Blood type', Y(0.545)],
    [`Fecha de vencimiento: ${formatCardDate(card.expiryDate)}`, 'Expiry date', Y(0.66)],
  ]
  for (const [text, note, top] of rows) {
    put(doc, text, x, top, { font: BOLD, size: 7.3, width, fit: 5 })
    put(doc, note, x, top + Y(0.05), { font: BOLD, size: 4.8 })
  }
}

interface SignatureLayout {
  president: { label: string; box: [number, number, number, number]; labelX: number }
  holder: { label: string; box: [number, number, number, number]; labelX: number }
  labelTop: number
  labelSize: number
}

const LICENSE_SIGNATURES: SignatureLayout = {
  president: { label: 'X Presidente INAC', box: [X(0.09), Y(0.75), X(0.17), Y(0.14)], labelX: X(0.09) },
  holder: {
    label: 'VII Firma del Titular (Holders signature)',
    box: [X(0.63), Y(0.72), X(0.19), Y(0.17)],
    labelX: X(0.5),
  },
  labelTop: Y(0.895),
  labelSize: 5.2,
}

const MEDICAL_SIGNATURES: SignatureLayout = {
  president: { label: 'Presidente INAC', box: [X(0.12), Y(0.75), X(0.13), Y(0.13)], labelX: X(0.09) },
  holder: {
    label: 'Firma del titular (holders signature)',
    box: [X(0.5), Y(0.72), X(0.18), Y(0.16)],
    labelX: X(0.49),
  },
  labelTop: Y(0.885),
  labelSize: 5.2,
}

/** The real cards print the signatures straight above their labels, without a rule. */
function signatures(doc: Doc, presidentSignature: CardImage | null, holder: CardHolder, layout: SignatureLayout) {
  image(doc, presidentSignature, 'SIN FIRMA', ...layout.president.box)
  put(doc, layout.president.label, layout.president.labelX, layout.labelTop, { font: BOLD, size: layout.labelSize })
  image(doc, holder.signature, 'SIN FIRMA', ...layout.holder.box)
  put(doc, layout.holder.label, layout.holder.labelX, layout.labelTop, {
    font: BOLD,
    size: layout.labelSize,
    width: W - layout.holder.labelX - 4,
    fit: 4,
  })
}

/** `Español/English  dd/Mmm/aaaa`, the way the real card prints each rating. */
const slashed = ({ es, en }: { es: string; en: string | null }) => (en && en !== es ? `${es}/${en}` : es)

function licenseBack(doc: Doc, card: LicenseCard, logo: CardImage) {
  image(doc, logo, 'LOGO INAC', X(0.85), Y(0.055), 28, 15)

  const x = X(0.04)
  labelled(
    doc,
    'XII Habilitaciones y Fecha de Vencimiento:',
    6.4,
    '(Ratings and Expire Date)',
    4.6,
    x,
    Y(0.07),
    REGULAR,
  )
  const ratings = [
    ...card.typeRatings.map((r) => `${r.aircraft.es} ${slashed(r.function)}  ${formatCardDate(r.expiryDate)}`),
    ...card.classRatings.map(
      (r) =>
        `${slashed(r.classRating)}${r.aircraft.length ? ` (${r.aircraft.map((a) => a.es).join(', ')})` : ''}  ${formatCardDate(r.expiryDate)}`,
    ),
  ]
  // The real card has room for three ratings at full size; more shrink so that every one still prints.
  const lines = ratings.length ? ratings : [NONE]
  const top = Y(0.112)
  const size = Math.max(4.5, Math.min(6.8, ((Y(0.55) - top) / lines.length - 0.4) / 1.156))
  let y = top
  for (const rating of lines) {
    if (y + size > Y(0.6)) break
    y += put(doc, rating, x, y, { font: BOLD, size, width: X(0.8), fit: 4.5 }) + 0.4
  }

  y = Math.max(Y(0.335), y + 6)
  put(doc, 'XIII Observaciones (Observations)', X(0.035), y, { size: 6.4 })
  y += Y(0.05)
  const observations = card.observations.length ? card.observations.map((o) => o.es) : [NONE]
  for (const observation of observations) {
    const room = Math.floor((Y(0.97) - y) / 7.3)
    if (room < 1) break
    y += put(doc, observation, X(0.035), y, { font: BOLD, size: 6, width: X(0.54), lines: room, lineGap: 0.4 }) + 1
  }
}

function medicalBack(doc: Doc, card: MedicalCard) {
  const restrictions = [...card.observations.map(bilingual), ...(card.restrictions ? [card.restrictions] : [])]
  const label = 'Restricciones / Observaciones:'
  put(doc, label, X(0.075), Y(0.06), { font: BOLD, size: 6.8, color: '#333333' })
  doc.font(BOLD).fontSize(6.8)
  const after = X(0.075) + doc.widthOfString(`${label} `)
  let y = Y(0.06)
  if (restrictions.length) {
    y += put(doc, restrictions.join('; '), after, y + CAP * 0.4, { size: 6.4, width: X(0.965) - after, lines: 2 })
  } else {
    y += 6.8
  }

  // Justified, tightly spaced lines as on the real card; the license-type list takes the room left.
  const left = X(0.055)
  const width = X(0.965) - left
  y = Math.max(Y(0.145), y + 3)
  y +=
    put(
      doc,
      'Este certificado médico es válido para el personal técnico aeronáutico que posean las licencias aeronáuticas siguientes:',
      left,
      y,
      { font: BOLD, size: 7.3, width, lines: 3, lineGap: -1.5, align: 'justify' },
    ) + 3.5

  doc.font(BOLD).fontSize(7.2)
  const validityHeight = doc.heightOfString(VALIDITY_TEXT, { width, lineGap: -1.4 })
  const validityTop = Y(0.61) - validityHeight
  const types = card.validForLicenseTypes.length ? licenseTypeSentence(card.validForLicenseTypes) : NONE
  doc.font(REGULAR).fontSize(6.4)
  const room = Math.max(1, Math.floor((validityTop - 3 - y) / (doc.currentLineHeight(true) - 0.8)))
  y += put(doc, types, left, y, { size: 6.4, color: RED, width, lines: room, lineGap: -0.8, align: 'justify' }) + 3.5

  y = Math.max(y, validityTop)
  put(doc, VALIDITY_TEXT, X(0.045), y, {
    font: BOLD,
    size: 7.2,
    width: X(0.965) - X(0.045),
    lines: 6,
    lineGap: -1.4,
    align: 'justify',
  })
  put(doc, DRIVING_TEXT, X(0.035), Y(0.645), { size: 6.3, width: X(0.555), lines: 6, lineGap: -1.2 })
}
