import { Printer } from 'lucide-react'
import { ComingSoonButton } from '../../../app/expediente/ComingSoon'
import { useRole } from '../../../app/role/useRole'

/** Header actions of the credentials feature (D7). "Imprimir credencial" arrives with W2-2. */
export function CredentialsActions() {
  const { can } = useRole()
  if (!can('credentials', 'export')) return null
  return (
    <ComingSoonButton variant="ghost" icon={Printer}>
      Imprimir credencial
    </ComingSoonButton>
  )
}
