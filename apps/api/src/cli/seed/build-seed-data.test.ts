import { deriveCredentialStatus, RAV67_CLASSES, ROLES, USER_AREAS } from '@sryg/types'
import { describe, expect, it } from 'vitest'
import { buildSeedData } from './build-seed-data'

const TODAY = '2026-10-14'
const data = buildSeedData({ seed: 2026, today: TODAY })
const statusOf = (expiry: string | null) => deriveCredentialStatus(expiry, TODAY, 30, false)

describe('buildSeedData (D25)', () => {
  it('is deterministic for a fixed seed and date', () => {
    expect(buildSeedData({ seed: 2026, today: TODAY })).toEqual(data)
    expect(buildSeedData({ seed: 7, today: TODAY }).personnel).not.toEqual(data.personnel)
  })

  it('builds SLYM-sized bilingual catalogs', () => {
    const { catalogs } = data
    expect(catalogs.licenseTypes.length).toBeGreaterThanOrEqual(40)
    expect(catalogs.typeRatings).toHaveLength(60)
    expect(catalogs.classRatings).toHaveLength(30)
    expect(catalogs.licenseObservations.length).toBeGreaterThanOrEqual(40)
    const bilingual = [
      catalogs.licenseTypes,
      catalogs.classRatings,
      catalogs.functions,
      catalogs.licenseObservations,
      catalogs.medicalObservations,
      catalogs.documentTypes,
      catalogs.attachmentTypes,
      catalogs.nationalities,
    ]
    for (const items of bilingual) for (const item of items) expect(item.nameEn, item.nameEs).toBeTruthy()
    for (const items of Object.values(catalogs)) {
      const names = items.map((i) => i.nameEs.toLowerCase())
      expect(new Set(names).size).toBe(names.length)
    }
  })

  it('marks every license type validity as a placeholder (D3)', () => {
    for (const type of data.catalogs.licenseTypes) {
      expect(type.validityIsPlaceholder).toBe(true)
      expect(type.validityMonths).toBe(12)
    }
    expect(data.catalogs.licenseTypes.some((t) => !t.appliesExpiry)).toBe(true)
    expect(new Set(data.catalogs.licenseTypes.map((t) => t.requiredMedicalClass))).toEqual(
      new Set([...RAV67_CLASSES, null]),
    )
  })

  it('creates one user per role and area', () => {
    const combos = data.users.map((u) => `${u.role}/${u.area}`).sort()
    expect(combos).toEqual(ROLES.flatMap((r) => USER_AREAS.map((a) => `${r}/${a}`)).sort())
  })

  it('creates about 50 fictitious people with unique document numbers', () => {
    expect(data.personnel).toHaveLength(50)
    expect(new Set(data.personnel.map((p) => p.cedula)).size).toBe(50)
    for (const person of data.personnel) {
      expect(person.cedula).toMatch(/^\d{8}$/)
      expect(person.email).toMatch(/@correo\.test$/)
    }
  })

  it('numbers credentials with the document number (D22) and leaves non-expiring licenses open (D20)', () => {
    const cedulaOf = new Map(data.personnel.map((p) => [p.id, p.cedula]))
    const typeOf = new Map(data.catalogs.licenseTypes.map((t) => [t.id, t]))
    for (const lic of data.licenses) {
      expect(lic.number).toBe(cedulaOf.get(lic.personalId))
      expect(lic.expiryDate === null).toBe(!typeOf.get(lic.licenseTypeId)!.appliesExpiry)
    }
    for (const cert of data.medicalCertificates) expect(cert.number).toBe(cedulaOf.get(cert.personalId))
  })

  it('mixes current, near-expiry and expired credentials of every kind', () => {
    const kinds = {
      licenses: data.licenses.map((l) => l.expiryDate),
      typeRatings: data.typeRatings.map((r) => r.expiryDate),
      classRatings: data.classRatings.map((r) => r.expiryDate),
      medical: data.medicalCertificates.map((c) => c.expiryDate),
    }
    for (const [kind, expiries] of Object.entries(kinds)) {
      const statuses = new Set(expiries.map(statusOf))
      for (const status of ['vigente', 'proxima_a_vencer', 'vencida'] as const)
        expect(statuses.has(status), `${kind} ${status}`).toBe(true)
    }
    expect(new Set(data.medicalCertificates.map((c) => c.rav67Class))).toEqual(new Set(RAV67_CLASSES))
  })

  it('gives class ratings at least one aircraft and some people active and resolved blocks', () => {
    for (const rating of data.classRatings) expect(rating.aircraftIds.length).toBeGreaterThan(0)
    expect(data.blocks.some((b) => b.status === 'activo')).toBe(true)
    expect(data.blocks.some((b) => b.status === 'resuelto')).toBe(true)
  })
})
