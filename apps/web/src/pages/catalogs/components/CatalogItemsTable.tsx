import type { AnyCatalogItemDto } from '@sryg/types'
import { Button } from '../../../common/components'
import { formatValidity, PLACEHOLDER_MARK, RAV60_LABEL, RAV67_LABEL } from '../utils/catalog-meta'
import clsx from '../../../common/utils/clsx'
import styles from './CatalogItemsTable.module.css'

export interface CatalogItemsTableProps {
  caption: string
  items: AnyCatalogItemDto[]
  /** License types add their RAV 60 category, required medical class and validity columns. */
  licenseTypes: boolean
  /** Admin only: row actions are not rendered otherwise. */
  actions?: {
    onEdit: (item: AnyCatalogItemDto) => void
    onToggleActive: (item: AnyCatalogItemDto) => void
    onDelete: (item: AnyCatalogItemDto) => void
    /** The item whose activation is being saved. */
    busyId?: string | null
  }
}

function Validity({ item }: { item: AnyCatalogItemDto }) {
  if (item.appliesExpiry === false) return <>No vence</>
  return (
    <>
      {formatValidity(item.validityMonths)}
      {item.validityIsPlaceholder ? <span className={styles.placeholder}>{PLACEHOLDER_MARK}</span> : null}
    </>
  )
}

/** Items of a catalog with both names (D19) and their state; becomes stacked rows on phones. */
export function CatalogItemsTable({ caption, items, licenseTypes, actions }: CatalogItemsTableProps) {
  return (
    <table className={styles.table}>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">Español</th>
          <th scope="col">Inglés</th>
          {licenseTypes ? (
            <>
              <th scope="col">Categoría RAV 60</th>
              <th scope="col">Clase médica</th>
              <th scope="col">Vigencia</th>
            </>
          ) : null}
          <th scope="col">Estado</th>
          {actions ? (
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className={clsx(!item.active && styles.inactive)}>
            <td className={styles.nameEs}>{item.nameEs}</td>
            <td className={styles.muted}>{item.nameEn ?? '—'}</td>
            {licenseTypes ? (
              <>
                <td className={styles.muted}>{item.rav60Category ? RAV60_LABEL[item.rav60Category] : '—'}</td>
                <td className={styles.muted}>
                  {item.requiredMedicalClass ? RAV67_LABEL[item.requiredMedicalClass] : 'Ninguna'}
                </td>
                <td className={styles.figure}>
                  <Validity item={item} />
                </td>
              </>
            ) : null}
            <td>
              <span className={clsx(styles.state, item.active ? styles.active : styles.off)}>
                {item.active ? 'Activo' : 'Inactivo'}
              </span>
            </td>
            {actions ? (
              <td className={styles.actions}>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Editar ${item.nameEs}`}
                  onClick={() => actions.onEdit(item)}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`${item.active ? 'Desactivar' : 'Activar'} ${item.nameEs}`}
                  loading={actions.busyId === item.id}
                  onClick={() => actions.onToggleActive(item)}
                >
                  {item.active ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Eliminar ${item.nameEs}`}
                  onClick={() => actions.onDelete(item)}
                >
                  Eliminar
                </Button>
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
