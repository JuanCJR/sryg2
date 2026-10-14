import { addDays, mulberry32 } from '../../../demo/seed'
import { DEMO_PERSON_ID, DEMO_ROSTER, type DemoPersonSeed, type DemoScenario } from '../../../demo/roster'
import type { LicenseFormData, LicenseFormRating } from '../domain/types'
import { deriveOwnStatus } from '../domain/status'

/**
 * Canonical synthetic license id for `demo-017`'s record. This feature builds its own
 * deterministic view of a person's license, derived only from `src/demo/roster.ts`'s shared
 * scenario — never from `personnel`'s data module, per the layering rule (a feature must not
 * import another feature's `data/`). Both features still agree on `demo-017`'s *status*
 * ('bloqueada') because both derive it from the same roster scenario.
 */
export const DEMO_LICENSE_ID = 'LIC-01'

const RATING_NAMES = ['Multimotor terrestre', 'Vuelo por instrumentos', 'Tipo ATR 72'] as const

/** Days-remaining range sampled per scenario — the same spread `personnel` uses, kept
 * feature-local so a license/rating status never looks arbitrary without crossing the
 * feature boundary. A block overrides display regardless of the underlying date. */
const SCENARIO_DAYS_RANGE: Record<DemoScenario, readonly [number, number]> = {
  activa: [90, 900],
  proxima: [1, 60],
  vencida: [-365, -1],
  bloqueada: [90, 900],
}

/** Deterministic per-person, per-credential day count: a fresh seeded draw from this roster
 * entry's fixed position and an `offset` distinguishing the license from each rating. */
function daysForSeed(seed: DemoPersonSeed, offset: number): number {
  const index = DEMO_ROSTER.findIndex((p) => p.id === seed.id)
  const random = mulberry32(index * 7 + offset + 4001)
  const [min, max] = SCENARIO_DAYS_RANGE[seed.scenario]
  return Math.round(min + random() * (max - min))
}

/**
 * Builds this feature's own view of a person's license and dependent ratings for the
 * Emisión/renovación form. `undefined` for an unknown id, which the container turns into the
 * 404 frame. `demo-017` always carries an open block, matching the Expediente's fixed scenario.
 */
export function buildLicenseFormData(id: string, today: Date): LicenseFormData | undefined {
  const seed = DEMO_ROSTER.find((p) => p.id === id)
  if (!seed) {
    return undefined
  }

  const isBlocked = seed.scenario === 'bloqueada'
  const licenseId = id === DEMO_PERSON_ID ? DEMO_LICENSE_ID : `LIC-${id.toUpperCase()}`
  const licenseVence = addDays(today, daysForSeed(seed, 0))

  const license = {
    id: licenseId,
    categoria: seed.categoria,
    numero: `${licenseId}-DEMO`,
    venceActual: licenseVence,
    estadoActual: deriveOwnStatus(licenseVence, today),
  }

  const ratings: LicenseFormRating[] = RATING_NAMES.map((nombre, index) => {
    const vence = addDays(today, daysForSeed(seed, index + 1))
    return {
      id: `${licenseId}-HAB-${index + 1}`,
      nombre,
      venceActual: vence,
      estadoActual: deriveOwnStatus(vence, today),
    }
  })

  return {
    person: { id: seed.id, cedula: seed.cedula, nombre: seed.nombre, categoria: seed.categoria },
    license,
    ratings,
    block: isBlocked
      ? {
          id: `B-${id.toUpperCase()}`,
          motivo: 'Documentación de renovación incompleta (demostración).',
          registradoEn: addDays(today, -8),
        }
      : undefined,
  }
}
