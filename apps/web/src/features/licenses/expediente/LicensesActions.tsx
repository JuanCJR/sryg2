import { UserPlus } from 'lucide-react'
import { ComingSoonButton } from '../../../app/expediente/ComingSoon'
import { useRole } from '../../../app/role/useRole'

/** Header actions of the licenses feature (D24: Admin or Supervisor de Licencias). Arrives with W1-5. */
export function LicensesActions() {
  const { can } = useRole()
  if (!can('licenses', 'write')) return null
  return (
    <ComingSoonButton variant="primary" icon={UserPlus}>
      Emitir o renovar
    </ComingSoonButton>
  )
}
