import { Pencil } from 'lucide-react'
import { useNavigate } from 'react-router'
import type { ExpedienteSlotProps } from '../../../common/types/expediente'
import { useRole } from '../../../common/hooks/useRole'
import { personnelEdit } from '../../../routes'
import { Button } from '../../../common/components'

/** Header actions of the personnel feature: "Editar datos" (PER-06), for whoever writes personnel. */
export function PersonnelActions({ person }: ExpedienteSlotProps) {
  const { can } = useRole()
  const navigate = useNavigate()
  if (!can('personnel', 'write')) return null
  return (
    <Button variant="secondary" icon={Pencil} onClick={() => navigate(personnelEdit(person.id))}>
      Editar datos
    </Button>
  )
}
