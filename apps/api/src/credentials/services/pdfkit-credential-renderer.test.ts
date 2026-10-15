import { PDFParse } from 'pdf-parse'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import type { CardImage, CardRenderContext, LicenseCard, MedicalCard } from '../dtos/credential-card.dto'
import { PdfKitCredentialRenderer } from './pdfkit-credential-renderer'

// Fictitious data only (D25): no real person, number or token.
const HOLDER = {
  firstNames: 'Ana Lucía',
  lastNames: 'Pérez Ficticia',
  address: 'Av. Las Acacias, Maracay',
  nationality: { es: 'Venezolana', en: 'Venezuelan' },
  birthDate: '1990-01-31',
  bloodType: 'o_pos' as const,
  photo: null,
  signature: null,
}

const LICENSE: LicenseCard = {
  kind: 'license',
  id: '11111111-1111-4111-8111-111111111111',
  personalId: '22222222-2222-4222-8222-222222222222',
  number: '00000101',
  issueDate: '2026-02-10',
  expiryDate: '2028-02-10',
  verificationToken: '33333333-3333-4333-8333-333333333333',
  licenseType: { es: 'Piloto Comercial - Avión', en: 'Commercial Pilot - Airplane' },
  holder: HOLDER,
  typeRatings: [
    { aircraft: { es: 'B737', en: null }, function: { es: 'Capitán', en: 'PIC' }, expiryDate: '2027-02-10' },
  ],
  classRatings: [
    {
      classRating: { es: 'Monomotores Terrestres', en: 'Single Engine Land' },
      aircraft: [
        { es: 'C172', en: null },
        { es: 'PA-28', en: null },
      ],
      expiryDate: '2027-08-15',
    },
  ],
  observations: [{ es: 'Debe usar lentes correctores', en: 'Shall wear corrective lenses' }],
}

const MEDICAL: MedicalCard = {
  kind: 'medical',
  id: '44444444-4444-4444-8444-444444444444',
  personalId: '22222222-2222-4222-8222-222222222222',
  number: '00000101',
  issueDate: '2026-03-01',
  expiryDate: '2027-03-01',
  verificationToken: '55555555-5555-4555-8555-555555555555',
  rav67Class: 'clase_1',
  restrictions: 'Solo vuelo diurno',
  observations: [{ es: 'Debe usar lentes correctivos', en: null }],
  validForLicenseTypes: [
    { es: 'Piloto Comercial - Avión', en: 'Commercial Pilot - Airplane' },
    { es: 'Piloto de Transporte de Línea Aérea', en: 'Airline Transport Pilot' },
  ],
  holder: HOLDER,
}

const NO_RESOURCES: CardRenderContext = {
  resources: { logoInac: null, presidentSignature: null },
  verificationUrl: 'https://sryg.test/verificar/33333333-3333-4333-8333-333333333333',
}

async function textOf(pdf: Buffer): Promise<string[]> {
  const parser = new PDFParse({ data: new Uint8Array(pdf) })
  try {
    const result = await parser.getText()
    return result.pages.map((page) => page.text)
  } finally {
    await parser.destroy()
  }
}

/** The MediaBox of every page, in points. */
const mediaBoxes = (pdf: Buffer) =>
  [...pdf.toString('latin1').matchAll(/\/MediaBox \[([^\]]+)\]/g)].map((m) => m[1]!.trim().split(/\s+/).map(Number))

describe('PdfKitCredentialRenderer (D7, §4)', () => {
  const renderer = new PdfKitCredentialRenderer()
  let png: CardImage
  let jpeg: CardImage

  beforeAll(async () => {
    const base = sharp({ create: { width: 60, height: 80, channels: 3, background: '#7a8899' } })
    png = { data: await base.clone().png().toBuffer(), mime: 'image/png' }
    jpeg = { data: await base.clone().jpeg().toBuffer(), mime: 'image/jpeg' }
  })

  it('prints the license on a CR80 card, front and back', async () => {
    const pdf = await renderer.render(LICENSE, NO_RESOURCES)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    const boxes = mediaBoxes(pdf)
    expect(boxes).toHaveLength(2)
    for (const [, , width, height] of boxes) {
      // 85.6 × 54 mm in points.
      expect(width).toBeCloseTo(242.65, 1)
      expect(height).toBeCloseTo(153.07, 1)
    }
  })

  it('license text: bilingual front and ratings, observations on the back (snapshot)', async () => {
    const [front, back] = await textOf(await renderer.render(LICENSE, NO_RESOURCES))
    expect(front).toMatchSnapshot('license front')
    expect(back).toMatchSnapshot('license back')
  })

  it('medical certificate text: class, blood type, restrictions and the license types it covers (snapshot)', async () => {
    const [front, back] = await textOf(await renderer.render(MEDICAL, NO_RESOURCES))
    expect(front).toMatchSnapshot('medical front')
    expect(back).toMatchSnapshot('medical back')
  })

  it('shows placeholders while the President signature, the photo or the signature are missing (D18)', async () => {
    const [front] = await textOf(await renderer.render(LICENSE, NO_RESOURCES))
    // The bundled official INAC logo stands in until the Admin uploads one.
    expect(front).not.toContain('LOGO INAC')
    expect(front).toContain('SIN FIRMA')
    expect(front).toContain('SIN FOTO')
  })

  it('draws the stored images instead of the placeholders when they exist', async () => {
    const card: LicenseCard = { ...LICENSE, holder: { ...HOLDER, photo: jpeg, signature: png } }
    const pdf = await renderer.render(card, {
      ...NO_RESOURCES,
      resources: { logoInac: png, presidentSignature: png },
    })
    const [front] = await textOf(pdf)
    expect(front).not.toContain('LOGO INAC')
    expect(front).not.toContain('SIN FIRMA')
    expect(front).not.toContain('SIN FOTO')
  })

  it('falls back to the placeholder when a stored image cannot be decoded', async () => {
    const broken = { data: Buffer.from('no es una imagen'), mime: 'image/png' }
    const card: LicenseCard = { ...LICENSE, holder: { ...HOLDER, photo: broken } }
    const [front] = await textOf(await renderer.render(card, NO_RESOURCES))
    expect(front).toContain('SIN FOTO')
  })

  it('says so when the license has no ratings or observations', async () => {
    const card: LicenseCard = { ...LICENSE, typeRatings: [], classRatings: [], observations: [] }
    const [, back] = await textOf(await renderer.render(card, NO_RESOURCES))
    expect(back).toMatch(/XII Habilitaciones[^]*Ninguna \/ None/)
    expect(back).toMatch(/Observaciones[^]*Ninguna \/ None/)
  })
})
