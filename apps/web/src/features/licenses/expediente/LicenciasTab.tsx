import { ComingSoonPanel } from '../../../app/expediente/ComingSoon'

/** Licencias page key: licenses with their type and class ratings (D20). W1-5 implements it. */
export function LicenciasTab() {
  return (
    <ComingSoonPanel
      description="Las licencias de la persona, con sus habilitaciones de tipo y de clase y sus observaciones."
      plannedChange="W1-5 feat/licenses"
    />
  )
}
