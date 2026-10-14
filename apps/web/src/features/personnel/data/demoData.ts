import type {
  AuditEntry,
  Bloqueo,
  CertificadoMedico,
  ExpedienteData,
  Habilitacion,
  Licencia,
  PersonnelListRow,
  Person,
} from '../domain/types'
import { deriveOwnStatus, pickCriticalCredential } from '../domain/status'
// Re-exported so existing imports of `DEMO_PERSON_ID` from this module keep working;
// `src/demo/roster.ts` is now the canonical source shared by every feature.
import { DEMO_PERSON_ID, DEMO_ROSTER, type DemoPersonSeed, type DemoScenario } from '../../../demo/roster'
import { mulberry32 } from '../../../demo/seed'

export { DEMO_PERSON_ID }

function addDays(base: Date, days: number, hour = 0, minute = 0): string {
  const result = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour, minute))
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString()
}

const OFFICE_START_MINUTE = 7 * 60 + 30 // 07:30
const OFFICE_SPAN_MINUTES = 10 * 60 // through 17:30

// 97 and 600 share no common factor, so seed indices spread across the window without repeating.
function officeHourMinute(seedIndex: number): { hour: number; minute: number } {
  const totalMinutes = OFFICE_START_MINUTE + ((seedIndex * 97) % OFFICE_SPAN_MINUTES)
  return { hour: Math.floor(totalMinutes / 60), minute: totalMinutes % 60 }
}

interface AuditSeed {
  offsetDays: number
  actor: string
  accion: AuditEntry['accion']
  entidad: AuditEntry['entidad']
  detalle: string
}

const AUDIT_SEEDS: AuditSeed[] = [
  {
    offsetDays: -1,
    actor: 'operador.demo',
    accion: 'Actualización',
    entidad: 'Personal',
    detalle: 'Actualización de datos de contacto (demostración).',
  },
  {
    offsetDays: -8,
    actor: 'supervisor.demo',
    accion: 'Registro de bloqueo',
    entidad: 'Bloqueo',
    detalle: 'Registro del bloqueo B-01 (Documentación de renovación incompleta).',
  },
  {
    offsetDays: -14,
    actor: 'operador.demo',
    accion: 'Actualización',
    entidad: 'Personal',
    detalle: 'Actualización del teléfono de contacto (demostración).',
  },
  {
    offsetDays: -21,
    actor: 'admin.demo',
    accion: 'Actualización',
    entidad: 'Habilitación',
    detalle: 'Actualización de datos de la habilitación Vuelo por instrumentos.',
  },
  {
    offsetDays: -35,
    actor: 'operador.demo',
    accion: 'Creación',
    entidad: 'Personal',
    detalle: 'Verificación de expediente para trámite de renovación (demostración).',
  },
  {
    offsetDays: -60,
    actor: 'admin.demo',
    accion: 'Actualización',
    entidad: 'Habilitación',
    detalle: 'Revisión periódica de la habilitación Tipo ATR 72.',
  },
  {
    offsetDays: -90,
    actor: 'supervisor.demo',
    accion: 'Actualización',
    entidad: 'Licencia',
    detalle: 'Revisión periódica de la licencia LIC-DEMO-0017.',
  },
  {
    offsetDays: -120,
    actor: 'operador.demo',
    accion: 'Actualización',
    entidad: 'Personal',
    detalle: 'Actualización del correo de contacto (demostración).',
  },
  {
    offsetDays: -150,
    actor: 'admin.demo',
    accion: 'Renovación',
    entidad: 'Habilitación',
    detalle: 'Renovación de la habilitación Multimotor terrestre.',
  },
  {
    offsetDays: -180,
    actor: 'supervisor.demo',
    accion: 'Actualización',
    entidad: 'Certificado médico',
    detalle: 'Revisión periódica del certificado médico RAV 67 Clase 1.',
  },
  {
    offsetDays: -210,
    actor: 'operador.demo',
    accion: 'Actualización',
    entidad: 'Personal',
    detalle: 'Actualización de la dependencia asignada (demostración).',
  },
  {
    offsetDays: -240,
    actor: 'admin.demo',
    accion: 'Actualización',
    entidad: 'Licencia',
    detalle: 'Verificación documental de la licencia LIC-DEMO-0017.',
  },
  {
    offsetDays: -270,
    actor: 'supervisor.demo',
    accion: 'Actualización',
    entidad: 'Habilitación',
    detalle: 'Revisión periódica de la habilitación Vuelo por instrumentos.',
  },
  {
    offsetDays: -300,
    actor: 'operador.demo',
    accion: 'Creación',
    entidad: 'Personal',
    detalle: 'Registro de foto pendiente en el expediente (demostración).',
  },
  {
    offsetDays: -331,
    actor: 'admin.demo',
    accion: 'Emisión',
    entidad: 'Certificado médico',
    detalle: 'Emisión del certificado médico RAV 67 Clase 1.',
  },
  {
    offsetDays: -360,
    actor: 'admin.demo',
    accion: 'Renovación',
    entidad: 'Habilitación',
    detalle: 'Renovación de la habilitación Tipo ATR 72.',
  },
  {
    offsetDays: -405,
    actor: 'supervisor.demo',
    accion: 'Resolución de bloqueo',
    entidad: 'Bloqueo',
    detalle: 'Resolución del bloqueo B-00.',
  },
  {
    offsetDays: -420,
    actor: 'supervisor.demo',
    accion: 'Registro de bloqueo',
    entidad: 'Bloqueo',
    detalle: 'Registro del bloqueo B-00 (Constancia de pago de derechos pendiente).',
  },
  {
    offsetDays: -460,
    actor: 'operador.demo',
    accion: 'Actualización',
    entidad: 'Personal',
    detalle: 'Verificación de datos personales tras ingreso (demostración).',
  },
  {
    offsetDays: -500,
    actor: 'admin.demo',
    accion: 'Emisión',
    entidad: 'Habilitación',
    detalle: 'Emisión de la habilitación Vuelo por instrumentos.',
  },
  {
    offsetDays: -540,
    actor: 'admin.demo',
    accion: 'Emisión',
    entidad: 'Habilitación',
    detalle: 'Emisión de la habilitación Multimotor terrestre.',
  },
  {
    offsetDays: -580,
    actor: 'admin.demo',
    accion: 'Emisión',
    entidad: 'Habilitación',
    detalle: 'Emisión de la habilitación Tipo ATR 72.',
  },
  {
    offsetDays: -640,
    actor: 'admin.demo',
    accion: 'Emisión',
    entidad: 'Licencia',
    detalle: 'Emisión de la licencia LIC-DEMO-0017 (Piloto comercial).',
  },
]

function buildHistorial(today: Date): AuditEntry[] {
  return AUDIT_SEEDS.map((seed, index) => {
    const { hour, minute } = officeHourMinute(index)
    return {
      id: `hist-${index + 1}`,
      fecha: addDays(today, seed.offsetDays, hour, minute),
      actor: seed.actor,
      accion: seed.accion,
      entidad: seed.entidad,
      detalle: seed.detalle,
    }
  }).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
}

/** Builds the full synthetic Expediente for demo-017, with every date relative to `today`. */
export function buildDemoExpediente(today: Date): ExpedienteData {
  const person: Person = {
    id: DEMO_PERSON_ID,
    cedula: 'V-00.000.017',
    nombre: 'Persona de Prueba 017',
    categoria: 'Piloto comercial',
    ratingLabel: 'RAV 60',
    tipoSangre: 'O+',
    cargo: 'Primer oficial (demostración)',
    dependencia: 'Operador de demostración',
    estatusInstitucional: 'Activo',
    email: 'persona.017@ejemplo.invalid',
    telefono: '+58 000 000 0017',
  }

  const licenciaId = 'LIC-01'
  const licencia: Licencia = {
    id: licenciaId,
    tipo: 'Piloto comercial',
    numero: 'LIC-DEMO-0017',
    emitida: addDays(today, -640),
    vence: addDays(today, 1185),
    ownStatus: deriveOwnStatus(addDays(today, 1185), today),
    bloqueadaPorId: 'B-01',
  }

  const habilitaciones: Habilitacion[] = [
    {
      id: 'HAB-01',
      licenciaId,
      nombre: 'Multimotor terrestre',
      emitida: addDays(today, -540),
      vence: addDays(today, 412),
      ownStatus: deriveOwnStatus(addDays(today, 412), today),
      bloqueadaPorId: 'B-01',
    },
    {
      id: 'HAB-02',
      licenciaId,
      nombre: 'Vuelo por instrumentos',
      emitida: addDays(today, -500),
      vence: addDays(today, 21),
      ownStatus: deriveOwnStatus(addDays(today, 21), today),
      bloqueadaPorId: 'B-01',
    },
    {
      id: 'HAB-03',
      licenciaId,
      nombre: 'Tipo ATR 72',
      emitida: addDays(today, -580),
      vence: addDays(today, -12),
      ownStatus: deriveOwnStatus(addDays(today, -12), today),
      bloqueadaPorId: 'B-01',
    },
  ]

  const certificado: CertificadoMedico = {
    id: 'CERT-01',
    norma: 'RAV 67',
    tipo: 'Clase 1',
    emitida: addDays(today, -331),
    vence: addDays(today, 34),
    ownStatus: deriveOwnStatus(addDays(today, 34), today),
    restriccion: 'Uso obligatorio de lentes correctivos',
  }

  const bloqueos: Bloqueo[] = [
    {
      id: 'B-01',
      tipo: 'Administrativo',
      motivo: 'Documentación de renovación incompleta',
      registradoEn: addDays(today, -8),
      registradoPor: 'supervisor.demo',
      estado: 'abierto',
      detieneLicenciaIds: [licenciaId],
    },
    {
      id: 'B-00',
      tipo: 'Administrativo',
      motivo: 'Constancia de pago de derechos pendiente',
      registradoEn: addDays(today, -420),
      registradoPor: 'supervisor.demo',
      resueltoEn: addDays(today, -405),
      resueltoPor: 'supervisor.demo',
      estado: 'resuelto',
      detieneLicenciaIds: [],
    },
  ]

  return {
    person,
    licencia,
    habilitaciones,
    certificado,
    bloqueos,
    historial: buildHistorial(today),
  }
}

/** The `?estado=` query values the container recognizes for demo purposes. */
export type DemoStateOverride = 'cargando' | 'error' | 'sin-alertas' | null

/** A variant with no open blocks and every credential comfortably valid — the "sin-alertas" demo state. */
export function buildSinAlertasExpediente(today: Date): ExpedienteData {
  const base = buildDemoExpediente(today)
  const licencia: Licencia = { ...base.licencia, bloqueadaPorId: undefined, vence: addDays(today, 900) }
  const habilitaciones = base.habilitaciones.map((hab) => ({
    ...hab,
    bloqueadaPorId: undefined,
    vence: addDays(today, 500),
    ownStatus: deriveOwnStatus(addDays(today, 500), today),
  }))
  const certificado: CertificadoMedico = {
    ...base.certificado,
    vence: addDays(today, 300),
    ownStatus: deriveOwnStatus(addDays(today, 300), today),
  }
  const bloqueos = base.bloqueos.map((b) =>
    b.id === 'B-01'
      ? { ...b, estado: 'resuelto' as const, resueltoEn: addDays(today, -1), resueltoPor: 'supervisor.demo' }
      : b,
  )

  return {
    ...base,
    licencia: { ...licencia, ownStatus: deriveOwnStatus(licencia.vence, today) },
    habilitaciones,
    certificado,
    bloqueos,
  }
}

/** Days-remaining range sampled per scenario for roster people other than demo-017 (a realistic spread, not one repeated number). */
const SCENARIO_DAYS_RANGE: Record<DemoScenario, readonly [number, number]> = {
  activa: [90, 900],
  proxima: [1, 60], // within OD-05's demo near-expiry threshold
  vencida: [-365, -1],
  // A block overrides display regardless of the underlying date, so the credential itself can
  // still read as comfortably valid — matches demo-017, whose licencia vence 1185 days out.
  bloqueada: [90, 900],
}

/** Deterministic per-person day count: a fresh seeded draw from this roster entry's fixed position, so it is stable across every call. */
function scenarioDaysRemaining(seed: DemoPersonSeed): number {
  const index = DEMO_ROSTER.findIndex((p) => p.id === seed.id)
  const random = mulberry32(index + 1)
  const [min, max] = SCENARIO_DAYS_RANGE[seed.scenario]
  return Math.round(min + random() * (max - min))
}

function buildScenarioHistorial(seed: DemoPersonSeed, today: Date): AuditEntry[] {
  const seeds: Array<{
    offsetDays: number
    actor: string
    accion: string
    entidad: AuditEntry['entidad']
    detalle: string
  }> = [
    {
      offsetDays: -5,
      actor: 'operador.demo',
      accion: 'Actualización',
      entidad: 'Personal',
      detalle: `Actualización de datos de contacto de ${seed.nombre} (demostración).`,
    },
    {
      offsetDays: -90,
      actor: 'supervisor.demo',
      accion: 'Actualización',
      entidad: 'Licencia',
      detalle: `Revisión periódica de la licencia de ${seed.nombre} (demostración).`,
    },
    {
      offsetDays: -640,
      actor: 'admin.demo',
      accion: 'Emisión',
      entidad: 'Licencia',
      detalle: `Emisión de la licencia de ${seed.nombre} (demostración).`,
    },
  ]
  return seeds
    .map((entry, index) => {
      const { hour, minute } = officeHourMinute(index + seed.id.length)
      return {
        id: `hist-${seed.id}-${index + 1}`,
        fecha: addDays(today, entry.offsetDays, hour, minute),
        actor: entry.actor,
        accion: entry.accion,
        entidad: entry.entidad,
        detalle: entry.detalle,
      }
    })
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
}

/** Builds a synthetic Expediente for a roster person (not demo-017) from their fixed `scenario`. */
function buildExpedienteFromScenario(seed: DemoPersonSeed, today: Date): ExpedienteData {
  const person: Person = {
    id: seed.id,
    cedula: seed.cedula,
    nombre: seed.nombre,
    categoria: seed.categoria,
    ratingLabel: 'RAV 60',
    tipoSangre: 'O+',
    cargo: 'Personal aeronáutico (demostración)',
    dependencia: 'Operador de demostración',
    estatusInstitucional: 'Activo',
    email: `${seed.id}@ejemplo.invalid`,
    telefono: '+58 000 000 0000',
  }

  const diasRestantes = scenarioDaysRemaining(seed)
  const isBlocked = seed.scenario === 'bloqueada'
  const licenciaId = `LIC-${seed.id}`
  const blockId = isBlocked ? `B-${seed.id}` : undefined

  const licencia: Licencia = {
    id: licenciaId,
    tipo: seed.categoria,
    numero: `LIC-${seed.id.toUpperCase()}`,
    emitida: addDays(today, -640),
    vence: addDays(today, diasRestantes),
    ownStatus: deriveOwnStatus(addDays(today, diasRestantes), today),
    bloqueadaPorId: blockId,
  }

  const habilitaciones: Habilitacion[] = [
    {
      id: `HAB-${seed.id}-01`,
      licenciaId,
      nombre: 'Multimotor terrestre',
      emitida: addDays(today, -540),
      vence: addDays(today, diasRestantes),
      ownStatus: deriveOwnStatus(addDays(today, diasRestantes), today),
      bloqueadaPorId: blockId,
    },
  ]

  const medicoVenceDias = diasRestantes > 0 ? diasRestantes : 34
  const certificado: CertificadoMedico = {
    id: `CERT-${seed.id}`,
    norma: 'RAV 67',
    tipo: 'Clase 1',
    emitida: addDays(today, -331),
    vence: addDays(today, medicoVenceDias),
    ownStatus: deriveOwnStatus(addDays(today, medicoVenceDias), today),
    restriccion: 'Uso obligatorio de lentes correctivos',
  }

  const bloqueos: Bloqueo[] =
    isBlocked && blockId
      ? [
          {
            id: blockId,
            tipo: 'Administrativo',
            motivo: 'Documentación de renovación incompleta (demostración).',
            registradoEn: addDays(today, -8),
            registradoPor: 'supervisor.demo',
            estado: 'abierto',
            detieneLicenciaIds: [licenciaId],
          },
        ]
      : []

  return {
    person,
    licencia,
    habilitaciones,
    certificado,
    bloqueos,
    historial: buildScenarioHistorial(seed, today),
  }
}

/**
 * The Listado's rows must open a real Expediente (design §"Rows in the Listado must open a
 * real Expediente"): for `demo-017` this returns exactly `buildDemoExpediente`'s output;
 * for any other roster id it builds one from that person's `scenario`; `undefined` for an
 * unknown id, which the container turns into the 404 frame.
 */
export function buildExpedienteFor(id: string, today: Date): ExpedienteData | undefined {
  if (id === DEMO_PERSON_ID) {
    return buildDemoExpediente(today)
  }
  const seed = DEMO_ROSTER.find((p) => p.id === id)
  return seed ? buildExpedienteFromScenario(seed, today) : undefined
}

/**
 * Rows for the Listado's annunciator/table. Built from each roster entry's own full Expediente
 * (via `buildExpedienteFor`, so demo-017 is exactly `buildDemoExpediente` and every other id is
 * exactly what its own detail page renders) and reduced with `pickCriticalCredential`, so the
 * row's status, days-remaining, and "credencial más crítica" label can never drift from what
 * the Expediente itself would show for that same person.
 */
export function buildPersonnelListRows(today: Date): PersonnelListRow[] {
  return DEMO_ROSTER.map((seed) => {
    const data = buildExpedienteFor(seed.id, today)
    if (!data) {
      // Unreachable: every DEMO_ROSTER entry always resolves through buildExpedienteFor.
      return {
        id: seed.id,
        cedula: seed.cedula,
        nombre: seed.nombre,
        categoria: seed.categoria,
        estado: seed.scenario,
        diasRestantes: 0,
        credencialCritica: '—',
      }
    }
    const critical = pickCriticalCredential(data, today)
    return {
      id: seed.id,
      cedula: data.person.cedula,
      nombre: data.person.nombre,
      categoria: data.person.categoria,
      estado: critical.status,
      diasRestantes: critical.diasRestantes,
      credencialCritica: critical.label,
    }
  })
}
