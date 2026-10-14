import { HistorialTab } from '../../features/audit/expediente/HistorialTab'
import { BlockingActions } from '../../features/blocking/expediente/BlockingActions'
import { BloqueosTab } from '../../features/blocking/expediente/BloqueosTab'
import { CredentialsActions } from '../../features/credentials/expediente/CredentialsActions'
import { LicenciasTab } from '../../features/licenses/expediente/LicenciasTab'
import { LicensesActions } from '../../features/licenses/expediente/LicensesActions'
import { MedicoTab } from '../../features/medical-certificates/expediente/MedicoTab'
import { DatosTab } from '../../features/personnel/expediente/DatosTab'
import { DocumentosTab } from '../../features/personnel/expediente/DocumentosTab'
import { PersonnelActions } from '../../features/personnel/expediente/PersonnelActions'
import type { ExpedienteActions, ExpedienteTab } from './types'

/** Page keys of the Expediente, in display order. Each tab is owned by its feature. */
export const EXPEDIENTE_TABS: ExpedienteTab[] = [
  { id: 'datos', label: 'Datos', Component: DatosTab },
  { id: 'documentos', label: 'Documentos', Component: DocumentosTab },
  { id: 'licencias', label: 'Licencias', Component: LicenciasTab },
  { id: 'medico', label: 'Médico', Component: MedicoTab },
  { id: 'bloqueos', label: 'Bloqueos', Component: BloqueosTab },
  { id: 'historial', label: 'Historial', permission: { module: 'audit', action: 'read' }, Component: HistorialTab },
]

/** Header action slots, in display order (primary action first, as in the approved design). */
export const EXPEDIENTE_ACTIONS: ExpedienteActions[] = [
  LicensesActions,
  BlockingActions,
  PersonnelActions,
  CredentialsActions,
]
