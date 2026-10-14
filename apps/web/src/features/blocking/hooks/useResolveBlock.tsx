import { useState, type ReactNode } from 'react'
import type { BlockDto } from '@sryg/types'
import { useToast } from '../../../design-system'
import { ApiError } from '../../../shared/api/fetch-json'
import { resolveBlock } from '../data/blocking-client'
import { notifyBlocksChanged } from '../data/blocks-changes'
import { blockSummary } from '../domain/block-view'
import { ResolveBlockDialog } from '../components/ResolveBlockDialog'

/** The resolve flow (BR-08) shared by /bloqueos and the Expediente: `start(block)` opens the dialog. */
export function useResolveBlock(): { start: (block: BlockDto) => void; dialog: ReactNode } {
  const toast = useToast()
  const [target, setTarget] = useState<BlockDto | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = (block: BlockDto) => {
    setError(null)
    setTarget(block)
  }

  const submit = async (resolutionNote: string) => {
    if (!target) return
    setSubmitting(true)
    setError(null)
    try {
      await resolveBlock(target.id, resolutionNote)
      setTarget(null)
      toast.show({ tone: 'info', message: 'Bloqueo resuelto.' })
      notifyBlocksChanged()
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setError('Este bloqueo ya estaba resuelto. La lista se actualizó.')
        notifyBlocksChanged()
      } else {
        setError('No se pudo resolver el bloqueo. Intente de nuevo.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const dialog = target ? (
    <ResolveBlockDialog
      blockLabel={blockSummary(target)}
      submitting={submitting}
      error={error}
      onSubmit={(note) => void submit(note)}
      onCancel={() => setTarget(null)}
    />
  ) : null

  return { start, dialog }
}
