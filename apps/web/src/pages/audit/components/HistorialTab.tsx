import type { ExpedienteSlotProps } from '../../../common/types/expediente'
import { HistorialContainer } from './HistorialContainer'

/** Historial page key: the person's audit trail (BR-11). Shown only with `audit:read` (registry). */
export function HistorialTab({ person }: ExpedienteSlotProps) {
  return <HistorialContainer personId={person.id} />
}
