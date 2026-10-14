import { FilePlus2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '../../../design-system'
import type { ExpedienteSlotProps } from '../../../app/expediente/types'
import { useRole } from '../../../app/role/useRole'
import { licenseForm } from '../../../app/routes'

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
