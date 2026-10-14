import type { ExpedienteSlotProps } from '../../../app/expediente/types'
import { DatosPanel } from '../components/DatosPanel'
import { toPersonView } from '../domain/person-view'

/** Datos page key: the person's record (D21 fields), straight from `GET /api/personnel/:id`. */
export function DatosTab({ person }: ExpedienteSlotProps) {
  return <DatosPanel person={toPersonView(person)} />
}
