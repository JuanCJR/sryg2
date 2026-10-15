import { useEffect, useId, useRef } from 'react'
import { Button, Radio, Skeleton } from '../../../common/components'
import {
  canPrint,
  credentialKey,
  formatDate,
  KIND_LABEL,
  STATUS_LABEL,
  type PrintableCredential,
} from '../utils/credential-view'
import styles from './PrintCredentialDialog.module.css'

export type CredentialOptions =
  { status: 'loading' } | { status: 'error'; retry: () => void } | { status: 'ready'; items: PrintableCredential[] }

export interface PrintCredentialDialogProps {
  /** "cédula · nombre": whose card is printed. */
  personLabel: string
  options: CredentialOptions
  /** Key of the chosen card (`kind:id`), or null. */
  selected: string | null
  submitting: boolean
  /** Validation or server failure, shown above the actions. */
  error: string | null
  onSelect: (key: string) => void
  onSubmit: () => void
  onCancel: () => void
}

function OptionList({
  items,
  selected,
  name,
  disabled,
  onSelect,
}: {
  items: PrintableCredential[]
  selected: string | null
  name: string
  disabled: boolean
  onSelect: (key: string) => void
}) {
  if (items.length === 0) return <p className={styles.empty}>La persona no tiene credenciales para imprimir.</p>
  return (
    <ul className={styles.options}>
      {items.map((item) => {
        const key = credentialKey(item)
        const printable = canPrint(item.status)
        return (
          <li key={key}>
            <label className={styles.option} data-disabled={!printable || undefined}>
              <Radio
                name={name}
                value={key}
                checked={selected === key}
                disabled={disabled || !printable}
                onChange={() => onSelect(key)}
              />
              <span className={styles.optionText}>
                <span className={styles.optionTitle}>
                  {KIND_LABEL[item.kind]} {item.number}
                </span>
                <span className={styles.optionMeta}>
                  {item.description} · Vence {formatDate(item.expiryDate)} · {STATUS_LABEL[item.status]}
                </span>
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Chooses which card to print (D7): a license or a medical certificate. Expired and blocked cards
 * are listed but cannot be chosen, since the API refuses them (409). Open while mounted.
 */
export function PrintCredentialDialog({
  personLabel,
  options,
  selected,
  submitting,
  error,
  onSelect,
  onSubmit,
  onCancel,
}: PrintCredentialDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const name = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    // jsdom and old engines lack showModal: fall back to a non-modal open dialog.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!submitting) onCancel()
      }}
    >
      <form
        className={styles.body}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!submitting) onSubmit()
        }}
      >
        <h2 id={titleId} className={styles.title}>
          Imprimir credencial
        </h2>
        <p className={styles.consequence}>
          Se genera el PDF en formato CR80, frente y reverso, de {personLabel}. La impresión queda registrada en la
          auditoría.
        </p>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Credencial</legend>
          {options.status === 'loading' ? (
            <div className={styles.loading} aria-busy="true">
              <span className="visually-hidden" role="status">
                Cargando credenciales…
              </span>
              <Skeleton className={styles.skeleton} />
              <Skeleton className={styles.skeleton} />
            </div>
          ) : options.status === 'error' ? (
            <p className={styles.empty}>
              No se pudieron cargar las credenciales.{' '}
              <Button type="button" variant="ghost" size="sm" onClick={options.retry}>
                Reintentar
              </Button>
            </p>
          ) : (
            <OptionList
              items={options.items}
              selected={selected}
              name={name}
              disabled={submitting}
              onSelect={onSelect}
            />
          )}
        </fieldset>
        {error ? (
          <p className={styles.error} role="status">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            Imprimir
          </Button>
        </div>
      </form>
    </dialog>
  )
}
