import styles from './LicenseSummaryRail.module.css'

export interface LicenseSummaryItem {
  id: string
  label: string
  nuevaFechaLabel: string
}

export interface LicenseSummaryRailProps {
  items: LicenseSummaryItem[]
}

/**
 * "Se emitirá" — states exactly what one click on Emitir will issue, credential by credential,
 * before the operator commits (the direction's memorable moment). Purely a display list; the
 * count and the Emitir button label live in the container's `actions`, stacked below this by
 * `FormPageTemplate`.
 */
export function LicenseSummaryRail({ items }: LicenseSummaryRailProps) {
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
      {/* At tablet/phone the itemized list gives way to this line, per the direction's "the
          rail moves below the sections as a sticky bottom bar with the count and Emitir". */}
      <p className={styles.count}>
        {items.length} {items.length === 1 ? 'credencial' : 'credenciales'}
      </p>
    </div>
  )
}
