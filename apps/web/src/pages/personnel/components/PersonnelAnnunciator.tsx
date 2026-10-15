import { useId } from 'react'
import { Lamp, type CredentialStatus } from '../../../common/components'
import clsx from '../../../common/utils/clsx'
import styles from './PersonnelAnnunciator.module.css'

export type PersonnelAnnunciatorCounts = Record<CredentialStatus, number>

export interface PersonnelAnnunciatorProps {
  counts: PersonnelAnnunciatorCounts
  /** The currently pressed lamp key, or null when no filter is active. */
  selected: CredentialStatus | null
  onToggle: (status: CredentialStatus) => void
  /** While the registry is loading: lamps render unlit ('sin-datos') and totals show a placeholder, so nothing reflows once data resolves. Keys are non-interactive. */
  loading?: boolean
  /**
   * The status summary has no data source yet (it needs the credential modules, W1-5/W1-6):
   * same unlit, inert keys as `loading`, plus a visible "Próximamente" note.
   */
  unavailable?: boolean
}

// Order and labels fixed by the List direction brief: BLOQUEADA, VENCIDA, PRÓXIMA A VENCER, ACTIVA — the same state word the rows use.
const KEYS: ReadonlyArray<{ status: CredentialStatus; label: string }> = [
  { status: 'bloqueada', label: 'Bloqueada' },
  { status: 'vencida', label: 'Vencida' },
  { status: 'proxima', label: 'Próxima a vencer' },
  { status: 'activa', label: 'Activa' },
]

/**
 * The annunciator panel: four equal lamp keys, each with a large tabular total. This is the
 * List direction's signature interaction — pressing a key filters the results to that state and
 * sorts them by days remaining, most urgent first; pressing the same key again clears the filter.
 */
export function PersonnelAnnunciator({
  counts,
  selected,
  onToggle,
  loading = false,
  unavailable = false,
}: PersonnelAnnunciatorProps) {
  const noteId = useId()
  const unlit = loading || unavailable
  return (
    <>
      <div
        className={styles.grid}
        role="group"
        aria-label="Resumen de estado de credenciales"
        aria-describedby={unavailable ? noteId : undefined}
      >
        {KEYS.map(({ status, label }) => {
          const isSelected = !unlit && selected === status
          return (
            <button
              key={status}
              type="button"
              className={clsx(styles.key, isSelected && styles.selected)}
              aria-pressed={isSelected}
              disabled={unlit}
              onClick={() => onToggle(status)}
            >
              <Lamp status={unlit ? 'sin-datos' : status} size="lg" />
              <span className={styles.label}>{label}</span>
              <span className={styles.total}>{unlit ? '—' : counts[status]}</span>
            </button>
          )
        })}
      </div>
      {unavailable ? (
        <p id={noteId} className={styles.note}>
          Próximamente: el resumen y el filtro por estado llegan con las licencias y los certificados médicos.
        </p>
      ) : null}
    </>
  )
}
