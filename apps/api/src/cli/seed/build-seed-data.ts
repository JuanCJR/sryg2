import {
  BLOCK_TYPES,
  BLOOD_TYPES,
  MEDICAL_VALIDITY_KEYS,
  type BlockStatus,
  type BlockType,
  type BloodType,
  PLACEHOLDER_LICENSE_VALIDITY_MONTHS,
  PLACEHOLDER_SETTINGS,
  type Rav60Category,
  type Rav67Class,
  type Role,
  ROLES,
  type UserArea,
  USER_AREAS,
} from '@sryg/types'
import {
  AIRCRAFT,
  ATTACHMENT_TYPES,
  CARGOS,
  CLASS_RATING_GROUPS,
  CLASS_RATINGS,
  DEPENDENCIAS,
  DOCUMENT_TYPES,
  FIRST_NAMES,
  FUNCTIONS,
  LAST_NAMES,
  LICENSE_OBSERVATIONS,
  LICENSE_TYPES,
  MEDICAL_OBSERVATIONS,
  NATIONALITIES,
  SECTORS,
  STREETS,
  TYPE_RATINGS,
} from './catalog-data'
import { createRandom, type Random } from './prng'

export interface SeedCatalogItem {
  id: string
  nameEs: string
  nameEn: string | null
}

export interface SeedLicenseType extends SeedCatalogItem {
  rav60Category: Rav60Category
  requiredMedicalClass: Rav67Class | null
  appliesExpiry: boolean
  validityMonths: number
  validityIsPlaceholder: boolean
}

export interface SeedData {
  catalogs: {
    licenseTypes: SeedLicenseType[]
    typeRatings: SeedCatalogItem[]
    classRatings: SeedCatalogItem[]
    aircraft: SeedCatalogItem[]
    functions: SeedCatalogItem[]
    licenseObservations: SeedCatalogItem[]
    medicalObservations: SeedCatalogItem[]
    documentTypes: SeedCatalogItem[]
    attachmentTypes: SeedCatalogItem[]
    nationalities: SeedCatalogItem[]
  }
  users: Array<{ id: string; email: string; fullName: string; role: Role; area: UserArea }>
  personnel: Array<{
    id: string
    cedula: string
    firstNames: string
    lastNames: string
    documentTypeId: string
    nationalityId: string
    birthDate: string
    address: string
    email: string
    phone: string
    bloodType: BloodType
    cargo: string
    dependencia: string
    category: Rav60Category
  }>
  licenses: Array<{
    id: string
    personalId: string
    licenseTypeId: string
    number: string
    issueDate: string
    expiryDate: string | null
    verificationToken: string
    observationIds: string[]
  }>
  typeRatings: Array<{ id: string; licenciaId: string; typeRatingId: string; functionId: string; expiryDate: string }>
  classRatings: Array<{
    id: string
    licenciaId: string
    classRatingId: string
    expiryDate: string
    aircraftIds: string[]
  }>
  medicalCertificates: Array<{
    id: string
    personalId: string
    rav67Class: Rav67Class
    number: string
    issueDate: string
    expiryDate: string
    restrictions: string | null
    verificationToken: string
    observationIds: string[]
  }>
  blocks: Array<{
    id: string
    personalId: string
    type: BlockType
    reason: string
    status: BlockStatus
    createdBy: string
    resolvedBy: string | null
    resolutionNote: string | null
  }>
}

export const PEOPLE = 50

const DAY_MS = 86_400_000
const parse = (iso: string) => new Date(`${iso}T00:00:00Z`)
const format = (date: Date) => date.toISOString().slice(0, 10)
const addDays = (iso: string, days: number) => format(new Date(parse(iso).getTime() + days * DAY_MS))
const addMonths = (iso: string, months: number) => {
  const date = parse(iso)
  date.setUTCMonth(date.getUTCMonth() + months)
  return format(date)
}

const ROLE_LABEL: Record<Role, string> = {
  administrador: 'Administrador',
  supervisor: 'Supervisor',
  consulta: 'Consulta',
}
const AREA_LABEL: Record<UserArea, string> = { licencias: 'Licencias', medicina: 'Medicina', ambas: 'Ambas áreas' }

const BLOCK_REASONS: Record<BlockType, string> = {
  administrativo: 'Documentación incompleta en el expediente',
  medico: 'Pendiente de evaluación médica especial',
  regulatorio: 'Investigación de incidente en curso',
}
const RESTRICTIONS = ['Uso obligatorio de lentes durante el servicio', 'Revisión oftalmológica anual']

const ascii = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function catalog(random: Random, items: ReadonlyArray<readonly [string, string] | string>): SeedCatalogItem[] {
  return items.map((item) =>
    typeof item === 'string'
      ? { id: random.uuid(), nameEs: item, nameEn: null }
      : { id: random.uuid(), nameEs: item[0], nameEn: item[1] },
  )
}

/**
 * Expiry relative to `today` that cycles through the three derived states, so every credential kind
 * has expired, near-expiry (within the 30-day placeholder threshold) and current items.
 */
function expiryCycle(random: Random, today: string) {
  const threshold = PLACEHOLDER_SETTINGS['alerts.threshold_days']
  let counter = 0
  return () => {
    const slot = counter++ % 7
    if (slot === 0) return addDays(today, -random.int(1, 400))
    if (slot === 1) return addDays(today, random.int(0, threshold - 5))
    return addDays(today, random.int(threshold + 10, 720))
  }
}

/** Fictitious, deterministic development data (D25): same `seed` and `today`, same data. */
export function buildSeedData({ seed, today }: { seed: number; today: string }): SeedData {
  const random = createRandom(seed)
  const licenseTypes: SeedLicenseType[] = LICENSE_TYPES.map((type) => ({
    id: random.uuid(),
    ...type,
    validityMonths: PLACEHOLDER_LICENSE_VALIDITY_MONTHS,
    validityIsPlaceholder: true,
  }))
  const catalogs: SeedData['catalogs'] = {
    licenseTypes,
    typeRatings: catalog(random, TYPE_RATINGS),
    classRatings: catalog(random, CLASS_RATINGS),
    aircraft: catalog(random, AIRCRAFT),
    functions: catalog(random, FUNCTIONS),
    licenseObservations: catalog(random, LICENSE_OBSERVATIONS),
    medicalObservations: catalog(random, MEDICAL_OBSERVATIONS),
    documentTypes: catalog(random, DOCUMENT_TYPES),
    attachmentTypes: catalog(random, ATTACHMENT_TYPES),
    nationalities: catalog(random, NATIONALITIES),
  }

  const users = ROLES.flatMap((role) =>
    USER_AREAS.map((area) => ({
      id: random.uuid(),
      email: `${role}.${area}@sryg.test`,
      fullName: `${ROLE_LABEL[role]} ${AREA_LABEL[area]} (demo)`,
      role,
      area,
    })),
  )
  const admin = users.find((u) => u.role === 'administrador' && u.area === 'ambas')!
  const supervisor = users.find((u) => u.role === 'supervisor' && u.area === 'ambas')!

  const [venezuelan, ...foreign] = catalogs.nationalities
  const [idV, idE, passport] = catalogs.documentTypes
  const typeOrder = random.sample(licenseTypes, licenseTypes.length)
  const cedulas = new Set<string>()
  const data: Omit<SeedData, 'catalogs' | 'users'> = {
    personnel: [],
    licenses: [],
    typeRatings: [],
    classRatings: [],
    medicalCertificates: [],
    blocks: [],
  }
  const nextLicenseExpiry = expiryCycle(random, today)
  const nextTypeRatingExpiry = expiryCycle(random, today)
  const nextClassRatingExpiry = expiryCycle(random, today)
  const nextMedicalExpiry = expiryCycle(random, today)
  const classByName = new Map(catalogs.classRatings.map((item) => [item.nameEs, item]))
  const classGroup = (group: keyof typeof CLASS_RATING_GROUPS) =>
    CLASS_RATING_GROUPS[group].map(([nameEs]) => classByName.get(nameEs)!)
  const pilotClasses = classGroup('pilot')
  const rpaClasses = classGroup('rpa')
  const technicianClasses = classGroup('technician')
  const [captain, copilot, notApplicable] = catalogs.functions

  const addLicense = (personalId: string, cedula: string, type: SeedLicenseType) => {
    const expiryDate = type.appliesExpiry ? nextLicenseExpiry() : null
    const issueDate = expiryDate ? addMonths(expiryDate, -type.validityMonths) : addDays(today, -random.int(100, 3000))
    const licenciaId = random.uuid()
    data.licenses.push({
      id: licenciaId,
      personalId,
      licenseTypeId: type.id,
      number: cedula,
      issueDate,
      expiryDate,
      verificationToken: random.uuid(),
      observationIds: random.sample(catalogs.licenseObservations, random.int(0, 2)).map((o) => o.id),
    })
    // Remote pilots (RPA/UA) hold RPA class ratings and no aircraft type ratings.
    const remote = /\b(RPA|UA)\b/.test(type.nameEs)
    const pilot = type.rav60Category.startsWith('piloto_') && !remote
    const typeRatingCount = pilot ? (type.rav60Category === 'piloto_privado' ? random.int(0, 1) : random.int(1, 2)) : 0
    for (const model of random.sample(catalogs.typeRatings, typeRatingCount)) {
      const fn = type.rav60Category === 'piloto_privado' ? notApplicable! : random.pick([captain!, copilot!])
      data.typeRatings.push({
        id: random.uuid(),
        licenciaId,
        typeRatingId: model.id,
        functionId: fn.id,
        expiryDate: nextTypeRatingExpiry(),
      })
    }
    const classes = remote
      ? rpaClasses
      : pilot
        ? pilotClasses
        : type.rav60Category === 'tecnico_mantenimiento'
          ? technicianClasses
          : []
    for (const cls of random.sample(classes, classes.length ? random.int(1, 2) : 0)) {
      data.classRatings.push({
        id: random.uuid(),
        licenciaId,
        classRatingId: cls.id,
        expiryDate: nextClassRatingExpiry(),
        aircraftIds: random.sample(catalogs.aircraft, random.int(1, 3)).map((a) => a.id),
      })
    }
  }

  for (let i = 0; i < PEOPLE; i++) {
    let cedula: string
    do cedula = String(random.int(5_000_000, 30_999_999)).padStart(8, '0')
    while (cedulas.has(cedula))
    cedulas.add(cedula)
    const firstNames = random.sample(FIRST_NAMES, random.int(1, 2)).join(' ')
    const lastNames = random.sample(LAST_NAMES, 2).join(' ')
    const local = random.next() < 0.85
    const type = typeOrder[i % typeOrder.length]!
    const id = random.uuid()
    data.personnel.push({
      id,
      cedula,
      firstNames,
      lastNames,
      documentTypeId: local ? idV!.id : random.pick([idE!, passport!]).id,
      nationalityId: local ? venezuelan!.id : random.pick(foreign).id,
      birthDate: addDays('1962-01-01', random.int(0, 14_600)),
      address: `${random.pick(STREETS)}, ${random.pick(SECTORS)}, Maracay, Aragua`,
      email: `${ascii(firstNames.split(' ')[0]!)}.${ascii(lastNames.split(' ')[0]!)}${i + 1}@correo.test`,
      phone: `0414-555${String(random.int(1000, 9999))}`,
      bloodType: random.pick(BLOOD_TYPES),
      cargo: random.pick(CARGOS),
      dependencia: random.pick(DEPENDENCIAS),
      category: type.rav60Category,
    })
    addLicense(id, cedula, type)
    // Some people hold a second license, e.g. an instructor rating on top of the pilot license.
    if (i % 9 === 4) addLicense(id, cedula, typeOrder[(i + 17) % typeOrder.length]!)

    if (type.requiredMedicalClass) {
      const expiryDate = nextMedicalExpiry()
      data.medicalCertificates.push({
        id: random.uuid(),
        personalId: id,
        rav67Class: type.requiredMedicalClass,
        number: cedula,
        issueDate: addMonths(expiryDate, -PLACEHOLDER_SETTINGS[MEDICAL_VALIDITY_KEYS[type.requiredMedicalClass]]),
        expiryDate,
        restrictions: random.next() < 0.2 ? random.pick(RESTRICTIONS) : null,
        verificationToken: random.uuid(),
        observationIds: random.sample(catalogs.medicalObservations, random.int(0, 2)).map((o) => o.id),
      })
    }

    const activeBlock = i % 10 === 5
    const resolvedBlock = i % 16 === 8
    if (activeBlock || resolvedBlock) {
      const blockType = BLOCK_TYPES[i % BLOCK_TYPES.length]!
      data.blocks.push({
        id: random.uuid(),
        personalId: id,
        type: blockType,
        reason: BLOCK_REASONS[blockType],
        status: activeBlock ? 'activo' : 'resuelto',
        createdBy: supervisor.id,
        resolvedBy: activeBlock ? null : admin.id,
        resolutionNote: activeBlock ? null : 'Impedimento subsanado y verificado (dato ficticio)',
      })
    }
  }

  return { catalogs, users, ...data }
}
