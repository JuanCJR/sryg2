import { HistorialTab } from './pages/audit/components/HistorialTab'
import { BlockingActions } from './pages/blocking/components/BlockingActions'
import { BloqueosTab } from './pages/blocking/components/BloqueosTab'
import { CredentialsActions } from './pages/credentials/components/CredentialsActions'
import { LicenciasTab } from './pages/licenses/components/LicenciasTab'
import { LicensesActions } from './pages/licenses/components/LicensesActions'
import { MedicoTab } from './pages/medical-certificates/components/MedicoTab'
import { DatosTab } from './pages/personnel/components/DatosTab'
import { DocumentosTab } from './pages/personnel/components/DocumentosTab'
import { PersonnelActions } from './pages/personnel/components/PersonnelActions'
import type { ExpedienteActions, ExpedienteTab } from './common/types/expediente'

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
