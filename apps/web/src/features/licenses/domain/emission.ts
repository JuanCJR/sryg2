import type { CatalogOption, CatalogRef, IssueLicenseInput, LicenseDto, RenewLicenseInput } from '@sryg/types'
import { classRatingLabel, typeRatingLabel } from './license-view'

/** What the trámite does with a rating the license already has. */
export type ExistingRatingAction = { kind: 'keep' } | { kind: 'renew'; expiryDate: string } | { kind: 'remove' }

export interface NewTypeRatingDraft {
  key: string
  typeRating: CatalogOption | null
  fn: CatalogOption | null
  expiryDate: string
}

export interface NewClassRatingDraft {
  key: string
  classRating: CatalogOption | null
  aircraft: CatalogOption[]
  expiryDate: string
}

/** The form's state. `license` is null when issuing a new license, the one being renewed otherwise. */
export interface EmissionDraft {
  license: LicenseDto | null
  licenseType: CatalogOption | null
  number: string
  issueDate: string
  observations: CatalogRef[]
  typeActions: Record<string, ExistingRatingAction>
  classActions: Record<string, ExistingRatingAction>
  newTypeRatings: NewTypeRatingDraft[]
  newClassRatings: NewClassRatingDraft[]
}

/** Defaults: the number is the holder's document (D22) or the license's own; the issue date is today. */
export function initialDraft(license: LicenseDto | null, cedula: string, today: string): EmissionDraft {
  return {
    license,
    licenseType: null,
    number: license?.number ?? cedula,
    issueDate: today,
    observations: license?.observations ?? [],
    typeActions: {},
    classActions: {},
    newTypeRatings: [],
    newClassRatings: [],
  }
}

const actionOf = (actions: Record<string, ExistingRatingAction>, id: string) => actions[id] ?? { kind: 'keep' }

/** Field key → message. Keys are stable per row so each message lands next to its control. */
export type EmissionErrors = Record<string, string>

export function validateDraft(draft: EmissionDraft): EmissionErrors {
  const errors: EmissionErrors = {}
  if (!draft.license && !draft.licenseType) errors.licenseType = 'Elija el tipo de licencia.'
  if (!draft.number.trim()) errors.number = 'Ingrese el número de la licencia.'
  if (!draft.issueDate) errors.issueDate = 'Ingrese la fecha de emisión.'
  for (const [id, action] of Object.entries(draft.typeActions)) {
    if (action.kind === 'renew' && !action.expiryDate) errors[`type-${id}`] = 'Ingrese la nueva fecha de vencimiento.'
  }
  for (const [id, action] of Object.entries(draft.classActions)) {
    if (action.kind === 'renew' && !action.expiryDate) errors[`class-${id}`] = 'Ingrese la nueva fecha de vencimiento.'
  }
  for (const rating of draft.newTypeRatings) {
    if (!rating.typeRating) errors[`${rating.key}-typeRating`] = 'Elija la aeronave.'
    if (!rating.fn) errors[`${rating.key}-fn`] = 'Elija la función.'
    if (!rating.expiryDate) errors[`${rating.key}-expiry`] = 'Ingrese el vencimiento.'
  }
  for (const rating of draft.newClassRatings) {
    if (!rating.classRating) errors[`${rating.key}-classRating`] = 'Elija la clase.'
    if (!rating.expiryDate) errors[`${rating.key}-expiry`] = 'Ingrese el vencimiento.'
  }
  return errors
}

const newTypeRatings = (draft: EmissionDraft) =>
  draft.newTypeRatings.map((r) => ({ typeRatingId: r.typeRating!.id, functionId: r.fn!.id, expiryDate: r.expiryDate }))

const newClassRatings = (draft: EmissionDraft) =>
  draft.newClassRatings.map((r) => ({
    classRatingId: r.classRating!.id,
    aircraftIds: r.aircraft.map((a) => a.id),
    expiryDate: r.expiryDate,
  }))

/** Body of `POST /api/licenses` for a valid draft. The expiry is never sent: the API computes it. */
export function issueBody(draft: EmissionDraft, personalId: string): IssueLicenseInput {
  return {
    personalId,
    licenseTypeId: draft.licenseType!.id,
    number: draft.number.trim(),
    issueDate: draft.issueDate,
    observationIds: draft.observations.map((o) => o.id),
    addTypeRatings: newTypeRatings(draft),
    addClassRatings: newClassRatings(draft),
  }
}

function changesOf(actions: Record<string, ExistingRatingAction>) {
  const renew: Array<{ id: string; expiryDate: string }> = []
  const remove: string[] = []
  for (const [id, action] of Object.entries(actions)) {
    if (action.kind === 'renew') renew.push({ id, expiryDate: action.expiryDate })
    if (action.kind === 'remove') remove.push(id)
  }
  return { renew, remove }
}

/** Body of `POST /api/licenses/:id/renew` for a valid draft: one trámite with the rating changes. */
export function renewBody(draft: EmissionDraft): RenewLicenseInput {
  const type = changesOf(draft.typeActions)
  const klass = changesOf(draft.classActions)
  return {
    number: draft.number.trim(),
    issueDate: draft.issueDate,
    observationIds: draft.observations.map((o) => o.id),
    addTypeRatings: newTypeRatings(draft),
    renewTypeRatings: type.renew,
    removeTypeRatingIds: type.remove,
    addClassRatings: newClassRatings(draft),
    renewClassRatings: klass.renew,
    removeClassRatingIds: klass.remove,
  }
}

export interface SummaryItem {
  id: string
  label: string
  /** The new expiry as a date, or a ready label (e.g. "Sin vencimiento"). */
  date: string | null
}

/**
 * What one click issues, credential by credential (the direction's memorable moment), and what
 * it removes. Rows with no choice yet show "—" until the operator fills them.
 */
export function summarize(draft: EmissionDraft): { issued: SummaryItem[]; removed: SummaryItem[] } {
  const issued: SummaryItem[] = []
  const removed: SummaryItem[] = []
  for (const rating of draft.license?.typeRatings ?? []) {
    const action = actionOf(draft.typeActions, rating.id)
    const label = typeRatingLabel(rating)
    if (action.kind === 'renew')
      issued.push({ id: rating.id, label: `Habilitación de tipo — ${label}`, date: action.expiryDate })
    if (action.kind === 'remove') removed.push({ id: rating.id, label: `Habilitación de tipo — ${label}`, date: null })
  }
  for (const rating of draft.license?.classRatings ?? []) {
    const action = actionOf(draft.classActions, rating.id)
    const label = classRatingLabel(rating)
    if (action.kind === 'renew')
      issued.push({ id: rating.id, label: `Habilitación de clase — ${label}`, date: action.expiryDate })
    if (action.kind === 'remove') removed.push({ id: rating.id, label: `Habilitación de clase — ${label}`, date: null })
  }
  for (const rating of draft.newTypeRatings) {
    const label =
      rating.typeRating && rating.fn ? typeRatingLabel({ typeRating: rating.typeRating, function: rating.fn }) : 'nueva'
    issued.push({ id: rating.key, label: `Habilitación de tipo — ${label}`, date: rating.expiryDate })
  }
  for (const rating of draft.newClassRatings) {
    const label = rating.classRating
      ? classRatingLabel({ classRating: rating.classRating, aircraft: rating.aircraft })
      : 'nueva'
    issued.push({ id: rating.key, label: `Habilitación de clase — ${label}`, date: rating.expiryDate })
  }
  return { issued, removed }
}

/** "Emitir licencia + 2 habilitaciones" — the primary action states the count. */
export function submitLabel(draft: EmissionDraft): string {
  const verb = draft.license ? 'Renovar licencia' : 'Emitir licencia'
  const ratings = summarize(draft).issued.length
  if (ratings === 0) return verb
  return `${verb} + ${ratings} ${ratings === 1 ? 'habilitación' : 'habilitaciones'}`
}

export function existingAction(draft: EmissionDraft, kind: 'type' | 'class', id: string): ExistingRatingAction {
  return actionOf(kind === 'type' ? draft.typeActions : draft.classActions, id)
}
