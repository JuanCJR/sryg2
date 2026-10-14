import clsx from '../../utils/clsx'
import styles from './Breadcrumb.module.css'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Ruta" className={clsx(styles.nav, className)}>
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${index}-${item.href ?? item.label}`} className={styles.item}>
              {isLast || !item.href ? (
                <span className={styles.current} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <a className={styles.link} href={item.href}>
                  {item.label}
                </a>
              )}
              {isLast ? null : (
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
