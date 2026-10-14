import type { ReactNode } from 'react'
import { ConditionTable, type ConditionRow } from '../../../app/expediente/ConditionTable'
import styles from './LicenciasPanel.module.css'

export interface LicenseDetailView {
  id: string
  title: string
  row: ConditionRow
  observations: string[]
  typeRatings: ConditionRow[]
  classRatings: ConditionRow[]
}

export interface LicenciasPanelProps {
  licenses: LicenseDetailView[]
  /** Per-license actions (renew link, history toggle), already filtered by `can()`. */
  renderActions?: (license: LicenseDetailView) => ReactNode
  /** Per-license history, when the operator opened it. */
  renderHistory?: (license: LicenseDetailView) => ReactNode
}

/**
 * The Licencias page key: one table with every license, then one block per license with its
 * observations and its type and class ratings (D20).
 */
export function LicenciasPanel({ licenses, renderActions, renderHistory }: LicenciasPanelProps) {
  return (
    <div className={styles.stack}>
      <ConditionTable caption="Licencias" rows={licenses.map((l) => l.row)} />
      {licenses.map((license) => (
        <section key={license.id} className={styles.license} aria-label={license.title}>
          <div className={styles.header}>
            <h2 className={styles.title}>{license.title}</h2>
            {renderActions ? <div className={styles.actions}>{renderActions(license)}</div> : null}
          </div>
          <div className={styles.observations}>
            <span className={styles.label}>Observaciones</span>
            {license.observations.length === 0 ? (
              <span className={styles.muted}>Sin observaciones.</span>
            ) : (
              <ul className={styles.list}>
                {license.observations.map((observation) => (
                  <li key={observation}>{observation}</li>
                ))}
              </ul>
            )}
          </div>
          <ConditionTable
            caption="Habilitaciones de tipo"
            groupLabel="Habilitaciones de tipo"
            rows={license.typeRatings}
            hideNumero
            emptyLabel="Sin habilitaciones de tipo."
          />
          <ConditionTable
            caption="Habilitaciones de clase"
            groupLabel="Habilitaciones de clase"
            rows={license.classRatings}
            hideNumero
            emptyLabel="Sin habilitaciones de clase."
          />
          {renderHistory?.(license)}
        </section>
      ))}
    </div>
  )
}
