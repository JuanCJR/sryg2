import { useState } from 'react'
import { Button } from '../../../common/components'
import { UserDialog } from './UserDialog'
import dialogStyles from './UserDialog.module.css'
import styles from './TemporaryPasswordDialog.module.css'

export interface TemporaryPasswordDialogProps {
  /** Null while there is nothing to show. */
  credentials: { email: string; password: string } | null
  onClose: () => void
}

/** Shows a temporary password exactly once (D4, D14): it is not retrievable after closing. */
export function TemporaryPasswordDialog({ credentials, onClose }: TemporaryPasswordDialogProps) {
  const [copied, setCopied] = useState(false)
  const close = () => {
    setCopied(false)
    onClose()
  }
  const copy = async () => {
    if (!credentials) return
    try {
      await navigator.clipboard.writeText(credentials.password)
      setCopied(true)
    } catch {
      // Without clipboard access the Admin still reads it from the screen.
    }
  }

  return (
    <UserDialog open={credentials !== null} title="Contraseña temporal" onClose={close}>
      {credentials ? (
        <>
          <p className={styles.lead}>
            Contraseña temporal de <strong>{credentials.email}</strong>:
          </p>
          <output className={styles.password}>{credentials.password}</output>
          <p className={styles.note}>
            Se muestra una sola vez. Entréguela al usuario: deberá cambiarla en su primer ingreso.
          </p>
          <div className={dialogStyles.actions}>
            <Button variant="secondary" onClick={copy}>
              {copied ? 'Copiada' : 'Copiar'}
            </Button>
            <Button onClick={close}>Listo</Button>
          </div>
        </>
      ) : null}
    </UserDialog>
  )
}
