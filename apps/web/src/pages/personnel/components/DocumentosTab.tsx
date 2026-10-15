import type { ExpedienteSlotProps } from '../../../common/types/expediente'
import { DocumentosContainer } from './DocumentosContainer'

/** Documentos page key (D21): the person's attached documents. */
export function DocumentosTab({ person }: ExpedienteSlotProps) {
  return <DocumentosContainer person={person} />
}
