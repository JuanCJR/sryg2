import { ComingSoonPanel } from '../../../app/expediente/ComingSoon'

/** Bloqueos page key (BR-07/BR-08, D2). W1-3 implements it. */
export function BloqueosTab() {
  return (
    <ComingSoonPanel
      description="Los bloqueos abiertos y resueltos de la persona."
      plannedChange="W1-3 feat/blocking"
    />
  )
}
