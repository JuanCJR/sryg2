import type { ExpedienteSlotProps } from '../../../app/expediente/types'
import { DocumentosContainer } from '../containers/DocumentosContainer'

/** Documentos page key (D21): the person's attached documents. */
export function DocumentosTab({ person }: ExpedienteSlotProps) {
  return <DocumentosContainer person={person} />
}
