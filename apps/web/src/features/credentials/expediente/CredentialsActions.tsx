import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Button, useToast } from '../../../design-system'
import type { ExpedienteSlotProps } from '../../../app/expediente/types'
import { useRole } from '../../../app/role/useRole'
import { ApiError } from '../../../shared/api/fetch-json'
import { useApiResource } from '../../../shared/api/useApiResource'
import { credentialKey, PrintCredentialDialog, type CredentialOptions } from '../components/PrintCredentialDialog'
import { downloadCredentialPdf, listPrintableCredentials } from '../data/credentials-client'

/** Saves a downloaded file through a temporary link. */
function saveFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function failureMessage(cause: unknown): string {
  if (cause instanceof ApiError && (cause.status === 409 || cause.status === 404)) return cause.message
  if (cause instanceof ApiError && cause.status === 403) return 'No tiene permiso para imprimir esta credencial.'
  return 'No se pudo generar la credencial. Intente de nuevo.'
}

/**
 * Header action of the credentials feature (OUT-05, D7): "Imprimir credencial" opens a dialog to
 * choose the license or the medical certificate, then downloads its CR80 PDF. A Supervisor sees
 * only the cards of their area (D24).
 */
export function CredentialsActions({ person }: ExpedienteSlotProps) {
  const { can } = useRole()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const kinds = { license: can('licenses', 'write'), medical: can('medical_certificates', 'write') }
  const allowed = can('credentials', 'export') && (kinds.license || kinds.medical)
  const credentials = useApiResource(open && allowed ? `${person.id}:${kinds.license}:${kinds.medical}` : null, () =>
    listPrintableCredentials(person.id, kinds),
  )
  if (!allowed) return null

  const options: CredentialOptions =
    credentials.status === 'ready'
      ? { status: 'ready', items: credentials.data }
      : credentials.status === 'error'
        ? { status: 'error', retry: credentials.retry }
        : { status: 'loading' }

  const close = () => {
    setOpen(false)
    setSelected(null)
    setError(null)
  }

  const print = async () => {
    const choice =
      credentials.status === 'ready' ? credentials.data.find((item) => credentialKey(item) === selected) : undefined
    if (!choice) {
      setError('Elija la credencial que quiere imprimir.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { blob, filename } = await downloadCredentialPdf(person.id, choice)
      saveFile(blob, filename)
      close()
      toast.show({ tone: 'info', message: 'Credencial generada.' })
    } catch (cause) {
      setError(failureMessage(cause))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="ghost" icon={Printer} onClick={() => setOpen(true)}>
        Imprimir credencial
      </Button>
      {open ? (
        <PrintCredentialDialog
          personLabel={`${person.cedula} · ${person.firstNames} ${person.lastNames}`}
          options={options}
          selected={selected}
          submitting={submitting}
          error={error}
          onSelect={(key) => {
            setSelected(key)
            setError(null)
          }}
          onSubmit={() => void print()}
          onCancel={close}
        />
      ) : null}
    </>
  )
}
