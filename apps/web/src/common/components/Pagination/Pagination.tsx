import { useId } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { IconButton } from '../IconButton/IconButton'
import clsx from '../../utils/clsx'
import { pageSlots } from './pageSlots'
import styles from './Pagination.module.css'

export interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** Total rows across every page — enables the "Mostrando 26–50 de 312" range line. */
  total?: number
  /** Rows per page; required with `total` for the range line. */
  pageSize?: number
  /** Offers a rows-per-page selector when set together with `pageSize`. */
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: readonly number[]
  className?: string
}

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100] as const

const figures = new Intl.NumberFormat('es-VE')

export function Pagination({
  page,
  pageCount,
  onPageChange,
  total,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  className,
}: PaginationProps) {
  const sizeId = useId()
  const go = (target: number) => {
    const next = Math.min(Math.max(1, target), pageCount)
    if (next !== page) onPageChange(next)
  }
  const showRange = total !== undefined && pageSize !== undefined
  const first = showRange ? Math.min(total, (page - 1) * pageSize + 1) : 0
  const last = showRange ? Math.min(total, page * pageSize) : 0

  return (
    <nav aria-label="Paginación" className={clsx(styles.pagination, className)}>
      <div className={styles.meta}>
        {showRange ? (
          <span className={styles.status}>
            Mostrando <span className={styles.figure}>{figures.format(first)}</span>–
            <span className={styles.figure}>{figures.format(last)}</span> de{' '}
            <span className={styles.figure}>{figures.format(total)}</span>
          </span>
        ) : null}
        {onPageSizeChange && pageSize !== undefined ? (
          <span className={styles.size}>
            <label htmlFor={sizeId} className={styles.sizeLabel}>
              Filas por página
            </label>
            <select
              id={sizeId}
              className={styles.sizeSelect}
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </span>
        ) : null}
      </div>

      <div className={styles.controls}>
        <IconButton
          icon={ChevronsLeft}
          variant="ghost"
          iconSize={16}
          aria-label="Primera página"
          className={styles.edge}
          disabled={page <= 1}
          onClick={() => go(1)}
        />
        <IconButton
          icon={ChevronLeft}
          iconSize={16}
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        />
        <ol className={styles.pages}>
          {pageSlots(page, pageCount).map((slot) =>
            typeof slot === 'number' ? (
              <li key={slot}>
                <button
                  type="button"
                  className={styles.pageButton}
                  aria-label={`Página ${slot}`}
                  aria-current={slot === page ? 'page' : undefined}
                  onClick={() => go(slot)}
                >
                  {slot}
                </button>
              </li>
            ) : (
              <li key={slot} className={styles.gap} aria-hidden="true">
                …
              </li>
            ),
          )}
        </ol>
        <span className={styles.compact}>
          Página <span className={styles.figure}>{page}</span> de <span className={styles.figure}>{pageCount}</span>
        </span>
        <IconButton
          icon={ChevronRight}
          iconSize={16}
          aria-label="Página siguiente"
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
        />
        <IconButton
          icon={ChevronsRight}
          variant="ghost"
          iconSize={16}
          aria-label="Última página"
          className={styles.edge}
          disabled={page >= pageCount}
          onClick={() => go(pageCount)}
        />
      </div>
    </nav>
  )
}
