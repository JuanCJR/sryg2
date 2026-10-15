import styles from './LicenseSummaryRail.module.css'

export interface LicenseSummaryItem {
  id: string
  label: string
  nuevaFechaLabel: string
}

export interface LicenseSummaryRailProps {
  items: LicenseSummaryItem[]
  /** Ratings the trámite removes: listed apart, never counted as issued. */
  removals?: LicenseSummaryItem[]
}

/**
 * "Se emitirá" — states exactly what one click on Emitir will issue, credential by credential,
 * before the operator commits (the direction's memorable moment), and what it removes. Purely a
 * display list; the Emitir button label lives in the container's `actions`, stacked below this
 * by `FormPageTemplate`.
 */
export function LicenseSummaryRail({ items, removals = [] }: LicenseSummaryRailProps) {
  return (
    <div aria-label="Se emitirá">
      <h2 className={styles.title}>Se emitirá</h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.itemLabel}>{item.label}</span>
            <span className={styles.itemDate}>{item.nuevaFechaLabel}</span>
          </li>
        ))}
      </ul>
      {removals.length > 0 ? (
        <>
          <h2 className={styles.title}>Se quitará</h2>
          <ul className={styles.list}>
            {removals.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.itemLabel}>{item.label}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {/* At tablet/phone the itemized list gives way to this line, per the direction's "the
          rail moves below the sections as a sticky bottom bar with the count and Emitir". */}
      <p className={styles.count}>
        {items.length} {items.length === 1 ? 'credencial' : 'credenciales'}
      </p>
    </div>
  )
}
