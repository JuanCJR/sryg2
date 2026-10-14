import { Pencil } from 'lucide-react'
import { ComingSoonButton } from '../../../app/expediente/ComingSoon'
import { useRole } from '../../../app/role/useRole'

/** Header actions of the personnel feature. "Editar datos" arrives with W1-4. */
export function PersonnelActions() {
  const { can } = useRole()
  if (!can('personnel', 'write')) return null
  return (
    <ComingSoonButton variant="secondary" icon={Pencil}>
      Editar datos
    </ComingSoonButton>
  )
}
