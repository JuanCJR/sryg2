import { mulberry32 } from './seed'

/**
 * Canonical synthetic people, shared by every feature so a person's status
 * (near-expiry, expired, blocked) never drifts between the Listado, a form,
 * and the Expediente.
 */

/** Which family of demo status a roster entry represents, independent of any one feature's own domain status type. */
export type DemoScenario = 'activa' | 'proxima' | 'vencida' | 'bloqueada'

export interface DemoPersonSeed {
  id: string
  cedula: string
  nombre: string
  categoria: string
  scenario: DemoScenario
}

/** The default person the app opens on. Its scenario ('bloqueada') matches `buildDemoExpediente`. */
export const DEMO_PERSON_ID = 'demo-017'

const CATEGORIES = [
  'Piloto comercial',
  'Piloto privado',
  'Mecánico de mantenimiento',
  'Controlador de tránsito aéreo',
  'Despachador de vuelo',
  'Instructor de vuelo',
] as const

/**
 * The List direction brief ("Lookup console with annunciator panel") states the registry
 * "holds thousands of people, so nobody browses it whole" — the roster is sized to read that
 * way, not as a handful of showcase rows.
 */
const ROSTER_SIZE = 1240

// Weighted so the registry reads mostly in order — credential problems are the exception at
// INAC, not the rule — while still giving every annunciator lamp a visible, non-trivial count.
const SCENARIO_WEIGHTS: ReadonlyArray<{ scenario: DemoScenario; weight: number }> = [
  { scenario: 'activa', weight: 62 },
  { scenario: 'proxima', weight: 20 },
  { scenario: 'vencida', weight: 12 },
  { scenario: 'bloqueada', weight: 6 },
]
const TOTAL_WEIGHT = SCENARIO_WEIGHTS.reduce((sum, entry) => sum + entry.weight, 0)

function pickScenario(random: () => number): DemoScenario {
  let roll = random() * TOTAL_WEIGHT
  for (const { scenario, weight } of SCENARIO_WEIGHTS) {
    roll -= weight
    if (roll <= 0) {
      return scenario
    }
  }
  return 'activa'
}

/**
 * "Obviously synthetic" per `PRODUCT.md`'s hard constraint: no real cédulas are ever
 * fabricated. Groups an 8-digit zero-padded index as `XX.XXX.XXX`, the same shape already
 * used for `demo-001`…`demo-006` and `demo-017` (`V-00.000.017`), generalized to the full
 * roster size.
 */
function formatSyntheticCedula(n: number): string {
  const digits = String(n).padStart(8, '0')
  return `V-${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}`
}

function buildRoster(): DemoPersonSeed[] {
  const random = mulberry32(2499) // fixed seed: byte-identical roster on every run
  const roster: DemoPersonSeed[] = []
  for (let n = 1; n <= ROSTER_SIZE; n += 1) {
    const id = n === 17 ? DEMO_PERSON_ID : `demo-${String(n).padStart(3, '0')}`
    const isPinned = id === DEMO_PERSON_ID
    const categoria = isPinned
      ? 'Piloto comercial'
      : CATEGORIES[Math.floor(random() * CATEGORIES.length) % CATEGORIES.length]
    const scenario = isPinned ? 'bloqueada' : pickScenario(random)
    roster.push({
      id,
      cedula: formatSyntheticCedula(n),
      nombre: `Persona de Prueba ${String(n).padStart(3, '0')}`,
      categoria,
      scenario,
    })
  }
  return roster
}

export const DEMO_ROSTER: readonly DemoPersonSeed[] = buildRoster()
