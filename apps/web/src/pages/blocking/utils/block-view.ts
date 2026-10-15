import type { BlockDto, BlockStatus, BlockType } from '@sryg/types'

export const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  administrativo: 'Administrativo',
  medico: 'Médico',
  regulatorio: 'Regulatorio',
}

export const BLOCK_STATUS_LABEL: Record<BlockStatus, string> = {
  activo: 'Activo',
  resuelto: 'Resuelto',
}

/** BR-07 / D9: an active block stops every credential of the person, not one in particular. */
export const BLOCK_STOPS_LABEL = 'emisión y renovación de licencias, habilitaciones y certificados médicos'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "05 oct 2026 · 14:30" (UTC, like the rest of the Expediente). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

/** Short, stable reference for a block: the first block of its uuid, e.g. "BLQ-AA000000". */
export function blockReference(id: string): string {
  return `BLQ-${id.slice(0, 8).toUpperCase()}`
}

export function personName(block: BlockDto): string {
  return `${block.person.firstNames} ${block.person.lastNames}`
}

export function registeredLabel(block: BlockDto): string {
  return `Registrado ${formatDateTime(block.createdAt)} por ${block.createdBy.fullName}`
}

/** Null while the block is active. */
export function resolutionLabel(block: BlockDto): string | null {
  if (block.status !== 'resuelto') return null
  const when = block.resolvedAt ? ` ${formatDateTime(block.resolvedAt)}` : ''
  const who = block.resolvedBy ? ` por ${block.resolvedBy.fullName}` : ''
  return `Resuelto${when}${who}: ${block.resolutionNote ?? ''}`
}

export function blockSummary(block: BlockDto): string {
  return `${blockReference(block.id)} · ${BLOCK_TYPE_LABEL[block.type]} — ${block.reason}`
}
