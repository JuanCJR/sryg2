import { Button } from '../../../design-system'
import type { ExpedienteSlotProps } from '../../../app/expediente/types'
import { useRole } from '../../../app/role/useRole'
import { BloqueosPanel, type BloqueoRowView } from '../components/BloqueosPanel'
import {
  BLOCK_STOPS_LABEL,
  BLOCK_TYPE_LABEL,
  blockReference,
  registeredLabel,
  resolutionLabel,
} from '../domain/block-view'
import { useBlocks } from '../hooks/useBlocks'
import { useResolveBlock } from '../hooks/useResolveBlock'
import styles from './BloqueosTab.module.css'

// Every block of one person, open and resolved, fits in one page in practice.
const MAX_BLOCKS = 100

/** Bloqueos page key (BR-07/BR-08, D2): the person's open and resolved blocks; Admin and Supervisors resolve. */
export function BloqueosTab({ person }: ExpedienteSlotProps) {
  const { can } = useRole()
  const canWrite = can('blocking', 'write')
  const blocks = useBlocks({ personalId: person.id, page: 1, pageSize: MAX_BLOCKS })
  const resolveFlow = useResolveBlock()

  if (blocks.status === 'loading') {
    return (
      <p className={styles.state} role="status">
        Cargando bloqueos…
      </p>
    )
  }

  if (blocks.status === 'error') {
    return (
      <div className={styles.state}>
        <p>No se pudieron cargar los bloqueos.</p>
        <Button variant="secondary" onClick={blocks.retry}>
          Reintentar
        </Button>
      </div>
    )
  }

  const items = blocks.data.items
  const rows: BloqueoRowView[] = items.map((block) => ({
    id: block.id,
    referencia: blockReference(block.id),
    tipo: BLOCK_TYPE_LABEL[block.type],
    motivo: block.reason,
    registradoLabel: registeredLabel(block),
    estado: block.status === 'activo' ? 'abierto' : 'resuelto',
    detieneLabel: BLOCK_STOPS_LABEL,
    resolucionLabel: resolutionLabel(block),
    canResolve: canWrite && block.status === 'activo',
  }))

  return (
    <>
      <BloqueosPanel
        rows={rows}
        onResolve={(id) => {
          const target = items.find((block) => block.id === id)
          if (target) resolveFlow.start(target)
        }}
      />
      {resolveFlow.dialog}
    </>
  )
}
