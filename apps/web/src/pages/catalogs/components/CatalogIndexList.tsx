import { Link } from 'react-router'
import { CATALOGS } from '@sryg/types'
import { catalogDetail } from '../../../routes'
import { CATALOG_META } from '../utils/catalog-meta'
import styles from './CatalogIndexList.module.css'

/** The D19 catalogs, one row per catalog linking to its maintenance page. */
export function CatalogIndexList() {
  return (
    <ul className={styles.list} aria-label="Catálogos">
      {CATALOGS.map((catalog) => (
        <li key={catalog}>
          <Link to={catalogDetail(catalog)} className={styles.row}>
            <span className={styles.title}>{CATALOG_META[catalog].title}</span>
            <span className={styles.description}>{CATALOG_META[catalog].description}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
