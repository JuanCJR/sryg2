import { useId, useState, type ReactNode } from 'react'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { Checkbox } from '../../atoms/Checkbox/Checkbox'
import { Icon } from '../../atoms/Icon/Icon'
import clsx from '../../utils/clsx'
import styles from './FilterPanel.module.css'

export interface FilterPanelProps {
  /** How many filters are narrowing the list right now (shown on the header and the phone toggle). */
  activeCount?: number
  /** Clears every filter at once; the action shows only while `activeCount` > 0. */
  onClearAll?: () => void
  /** Names the landmark, e.g. "Filtros de bloqueos". */
  'aria-label'?: string
  children: ReactNode
  className?: string
}

/**
 * The left filter column of every list page. Wide layouts keep it open beside the results; on
 * tablets and phones it collapses behind a "Filtros" toggle that carries the active count, so the
 * results stay first on a small screen.
 */
export function FilterPanel({
  activeCount = 0,
  onClearAll,
  'aria-label': ariaLabel = 'Filtros',
  children,
  className,
}: FilterPanelProps) {
  const bodyId = useId()
  const [open, setOpen] = useState(false)

  return (
    <aside className={clsx(styles.panel, className)} aria-label={ariaLabel}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((current) => !current)}
        >
          <Icon icon={SlidersHorizontal} size={16} />
          <span className={styles.heading}>Filtros</span>
          {activeCount > 0 ? <span className={styles.count}>{activeCount}</span> : null}
          <Icon icon={ChevronDown} size={16} className={styles.toggleChevron} />
        </button>
        <span className={styles.staticHeading}>
          <Icon icon={SlidersHorizontal} size={16} />
          <span className={styles.heading}>Filtros</span>
          {activeCount > 0 ? <span className={styles.count}>{activeCount}</span> : null}
        </span>
        {onClearAll && activeCount > 0 ? (
          <button type="button" className={styles.clear} onClick={onClearAll}>
            <Icon icon={X} size={16} />
            Limpiar todo
          </button>
        ) : null}
      </div>
      <div id={bodyId} className={styles.body} data-open={open}>
        {children}
      </div>
    </aside>
  )
}

export interface FilterSectionProps {
  title: string
  /** Selected values in this section; a figure beside the title. */
  activeCount?: number
  onClear?: () => void
  defaultOpen?: boolean
  children: ReactNode
}

/** A collapsible group inside `FilterPanel` (one field or one checkbox list). */
export function FilterSection({ title, activeCount = 0, onClear, defaultOpen = true, children }: FilterSectionProps) {
  const contentId = useId()
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <button
          type="button"
          className={styles.sectionToggle}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((current) => !current)}
        >
          <Icon icon={ChevronDown} size={16} className={styles.sectionChevron} />
          <span className={styles.sectionTitle}>{title}</span>
          {activeCount > 0 ? <span className={styles.count}>{activeCount}</span> : null}
        </button>
        {onClear && activeCount > 0 ? (
          <button type="button" className={styles.sectionClear} onClick={onClear} aria-label={`Limpiar ${title}`}>
            Limpiar
          </button>
        ) : null}
      </div>
      <div id={contentId} className={styles.sectionContent} hidden={!open}>
        {children}
      </div>
    </section>
  )
}

export interface CheckboxFilterOption<T extends string> {
  value: T
  label: string
  /** Optional figure, e.g. how many rows carry this value. */
  count?: number
}

export interface CheckboxFilterProps<T extends string> {
  title: string
  options: readonly CheckboxFilterOption<T>[]
  /** Selected values; empty means "no filter" (every value). */
  value: readonly T[]
  onChange: (value: T[]) => void
  disabled?: boolean
  defaultOpen?: boolean
}

/** A titled list of checkboxes — the multi-select filter. Nothing checked means every value. */
export function CheckboxFilter<T extends string>({
  title,
  options,
  value,
  onChange,
  disabled = false,
  defaultOpen,
}: CheckboxFilterProps<T>) {
  const toggle = (option: T, checked: boolean) => {
    const next = checked ? [...value, option] : value.filter((current) => current !== option)
    // Keep the options' own order, so the query string and the UI never drift apart.
    onChange(options.map((candidate) => candidate.value).filter((candidate) => next.includes(candidate)))
  }

  return (
    <FilterSection
      title={title}
      activeCount={value.length}
      onClear={disabled ? undefined : () => onChange([])}
      defaultOpen={defaultOpen}
    >
      <fieldset className={styles.fieldset} disabled={disabled}>
        <legend className="visually-hidden">{title}</legend>
        {options.map((option) => {
          const checked = value.includes(option.value)
          return (
            <label key={option.value} className={styles.option} data-checked={checked}>
              <Checkbox checked={checked} onChange={(event) => toggle(option.value, event.target.checked)} />
              <span className={styles.optionLabel}>{option.label}</span>
              {option.count !== undefined ? <span className={styles.optionCount}>{option.count}</span> : null}
            </label>
          )
        })}
      </fieldset>
    </FilterSection>
  )
}
