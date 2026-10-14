import { Lock } from 'lucide-react'
import { ComingSoonButton } from '../../../app/expediente/ComingSoon'
import { useRole } from '../../../app/role/useRole'

/** Header actions of the blocking feature (D2: Admin and Supervisor). Arrives with W1-3. */
export function BlockingActions() {
  const { can } = useRole()
  if (!can('blocking', 'write')) return null
  return (
    <ComingSoonButton variant="secondary" icon={Lock}>
      Registrar bloqueo
    </ComingSoonButton>
  )
}
