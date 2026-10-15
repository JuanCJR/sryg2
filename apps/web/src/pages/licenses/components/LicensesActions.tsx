import { FilePlus2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '../../../common/components'
import type { ExpedienteSlotProps } from '../../../common/types/expediente'
import { useRole } from '../../../common/hooks/useRole'
import { licenseForm } from '../../../routes'

/** Header action of the licenses feature (D24: Admin or Supervisor de Licencias): opens the trámite. */
export function LicensesActions({ person }: ExpedienteSlotProps) {
  const { can } = useRole()
  const navigate = useNavigate()
  if (!can('licenses', 'write')) return null
  return (
    <Button variant="primary" icon={FilePlus2} onClick={() => navigate(licenseForm(person.id))}>
      Emitir o renovar
    </Button>
  )
}
