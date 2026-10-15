import type { ClassRatingDto, LicenseDto, LicenseHistoryEntryDto, TypeRatingDto } from '@sryg/types'
import type { ConditionRow } from '../../../common/components/ConditionTable/ConditionTable'
import { formatDate, formatExpiry, formatRemaining } from './format'
import { toCredentialStatus } from './status'

export const typeRatingLabel = (r: Pick<TypeRatingDto, 'typeRating' | 'function'>) =>
  `${r.typeRating.nameEs} · ${r.function.nameEs}`

export const classRatingLabel = (r: Pick<ClassRatingDto, 'classRating' | 'aircraft'>) =>
  r.aircraft.length === 0
    ? r.classRating.nameEs
    : `${r.classRating.nameEs} · ${r.aircraft.map((a) => a.nameEs).join(', ')}`

export function licenseRow(license: LicenseDto, today: string): ConditionRow {
  return {
    id: license.id,
    status: toCredentialStatus(license.status),
    nombre: license.licenseType.nameEs,
    numero: license.number,
    emitidaLabel: formatDate(license.issueDate),
    venceLabel: formatExpiry(license.expiryDate),
    restanteLabel: formatRemaining(license.expiryDate, today),
  }
}

/** Ratings have no issue date of their own in the schema (D20): only their expiry. */
function ratingRow(id: string, nombre: string, rating: TypeRatingDto | ClassRatingDto, today: string): ConditionRow {
  return {
    id,
    status: toCredentialStatus(rating.status),
    nombre,
    emitidaLabel: '—',
    venceLabel: formatDate(rating.expiryDate),
    restanteLabel: formatRemaining(rating.expiryDate, today),
  }
}

export const typeRatingRow = (r: TypeRatingDto, today: string) => ratingRow(r.id, typeRatingLabel(r), r, today)
export const classRatingRow = (r: ClassRatingDto, today: string) => ratingRow(r.id, classRatingLabel(r), r, today)

const ACTION_LABEL: Partial<Record<LicenseHistoryEntryDto['action'], string>> = {
  emitir: 'Emisión',
  renovar: 'Renovación',
  eliminar: 'Eliminación',
  crear: 'Alta',
  actualizar: 'Modificación',
}

const ENTITY_LABEL: Record<LicenseHistoryEntryDto['entity'], string> = {
  licencia: 'Licencia',
  habilitacion_tipo: 'Habilitación de tipo',
  habilitacion_clase: 'Habilitación de clase',
}

export function historyLine(entry: LicenseHistoryEntryDto) {
  return {
    id: entry.id,
    what: `${ENTITY_LABEL[entry.entity]} — ${ACTION_LABEL[entry.action] ?? entry.action} · ${entry.actorName ?? 'Sistema'}`,
    when: entry.occurredAt,
  }
}
