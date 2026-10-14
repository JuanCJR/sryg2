import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../../atoms/IconButton/IconButton'
import clsx from '../../utils/clsx'
import styles from './Pagination.module.css'

export interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ page, pageCount, onPageChange, className }: PaginationProps) {
  return (
    <nav aria-label="Paginación" className={clsx(styles.pagination, className)}>
      <IconButton
        icon={ChevronLeft}
        aria-label="Página anterior"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      />
      <span className={styles.status}>
        Página <span className={styles.figure}>{page}</span> de <span className={styles.figure}>{pageCount}</span>
      </span>
      <IconButton
        icon={ChevronRight}
        aria-label="Página siguiente"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  )
}
