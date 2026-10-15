import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Lock } from 'lucide-react'
import { Button, useToast } from '../../../common/components'
import type { ExpedienteSlotProps } from '../../../common/types/expediente'
import { useRole } from '../../../common/hooks/useRole'
import { ApiError } from '../../../common/services/fetch-json'
import { ActiveBlockBanner } from './ActiveBlockBanner'
import { RegisterBlockDialog, type RegisterBlockValues } from './RegisterBlockDialog'
import { registerBlock } from '../services/blocking-client'
import { notifyBlocksChanged } from '../services/blocks-changes'
import { BLOCK_STOPS_LABEL, BLOCK_TYPE_LABEL, blockReference } from '../utils/block-view'
import { useBlocks } from '../hooks/useBlocks'

// A person rarely holds more than a handful of open impediments; the banner lists them all.
const MAX_ACTIVE = 100

/**
 * The blocking feature's header slot: the persistent banner while the person has an active block
 * (every role, every page key) and, for the Admin and Supervisors (D2), "Registrar bloqueo".
 */
export function BlockingActions({ person }: ExpedienteSlotProps) {
  const { can } = useRole()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [registering, setRegistering] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = useBlocks({ personalId: person.id, status: ['activo'], page: 1, pageSize: MAX_ACTIVE })

  const submit = async (values: RegisterBlockValues) => {
    setSubmitting(true)
    setError(null)
    try {
      await registerBlock({ personalId: person.id, ...values })
      setRegistering(false)
      toast.show({ tone: 'warning', message: 'Bloqueo registrado.' })
      notifyBlocksChanged()
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 404
          ? 'La persona ya no existe en el registro.'
          : 'No se pudo registrar el bloqueo. Intente de nuevo.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const showBlocks =
    searchParams.get('pagina') === 'bloqueos'
      ? undefined
      : () =>
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev)
              next.set('pagina', 'bloqueos')
              return next
            },
            { replace: true },
          )

  // The banner is silent while loading or on error: no banner never claims "sin bloqueos".
  const activeBlocks = active.status === 'ready' ? active.data.items : []

  return (
    <>
      {activeBlocks.length > 0 ? (
        <ActiveBlockBanner
          blocks={activeBlocks.map((block) => ({
            id: block.id,
            reference: blockReference(block.id),
            typeLabel: BLOCK_TYPE_LABEL[block.type],
            reason: block.reason,
          }))}
          stopsLabel={BLOCK_STOPS_LABEL}
          onShow={showBlocks}
        />
      ) : null}
      {can('blocking', 'write') ? (
        <Button
          variant="secondary"
          icon={Lock}
          onClick={() => {
            setError(null)
            setRegistering(true)
          }}
        >
          Registrar bloqueo
        </Button>
      ) : null}
      {registering ? (
        <RegisterBlockDialog
          personLabel={`${person.cedula} · ${person.firstNames} ${person.lastNames}`}
          submitting={submitting}
          error={error}
          onSubmit={(values) => void submit(values)}
          onCancel={() => setRegistering(false)}
        />
      ) : null}
    </>
  )
}
