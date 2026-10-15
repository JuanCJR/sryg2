import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, ChevronDown, Loader2, X } from 'lucide-react'
import { Icon } from '../Icon/Icon'
import inputStyles from '../Input/Input.module.css'
import clsx from '../../utils/clsx'
import { normalizeText } from '../../utils/normalizeText'
import styles from './Combobox.module.css'

export interface ComboboxOption {
  value: string
  label: string
  /** Secondary line (e.g. the English name of a catalog item). */
  description?: string
}

export interface ComboboxProps {
  options: readonly ComboboxOption[]
  /** Selected option value, or `null`. */
  value: string | null
  /** Label of the selected value, when it may not be among `options` (server-side search). */
  selectedLabel?: string
  onChange: (value: string | null) => void
  /**
   * Fires as the user types. When set, the parent searches (e.g. on the server) and passes the
   * matching `options`; without it the combobox filters `options` itself.
   */
  onSearch?: (text: string) => void
  /** Fires when the list opens, so a lazy source can start loading. */
  onOpen?: () => void
  status?: 'ready' | 'loading' | 'error'
  onRetry?: () => void
  emptyMessage?: string
  placeholder?: string
  disabled?: boolean
  /** Shows the clear (×) button while a value is selected. */
  clearable?: boolean
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'aria-label'?: string
  /** Name of the listbox, for assistive tech. */
  listLabel?: string
}

function Highlight({ text, term }: { text: string; term: string }): ReactNode {
  const needle = normalizeText(term.trim())
  if (!needle) return text
  const index = normalizeText(text).indexOf(needle)
  if (index < 0) return text
  return (
    <>
      {text.slice(0, index)}
      <mark className={styles.match}>{text.slice(index, index + needle.length)}</mark>
      {text.slice(index + needle.length)}
    </>
  )
}

/**
 * ARIA 1.2 select-only-with-search combobox: type to filter, ↑/↓ to move, Home/End to jump,
 * Enter to pick, Escape to close; the chevron opens the full list and × clears the value. The
 * selected option carries a check mark and matches are highlighted as you type.
 */
export function Combobox({
  options,
  value,
  selectedLabel,
  onChange,
  onSearch,
  onOpen,
  status = 'ready',
  onRetry,
  emptyMessage = 'Sin coincidencias',
  placeholder = 'Escriba para buscar…',
  disabled = false,
  clearable = true,
  id,
  listLabel = 'Opciones',
  ...aria
}: ComboboxProps) {
  const listboxId = useId()
  const optionIdPrefix = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  // Null while the user is not editing: the input then shows the selected value.
  const [text, setText] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const term = text ?? ''
  const visible =
    onSearch || !term.trim()
      ? options
      : options.filter((option) =>
          normalizeText(`${option.label} ${option.description ?? ''}`).includes(normalizeText(term.trim())),
        )
  const active = activeIndex >= 0 && activeIndex < visible.length ? activeIndex : -1
  const currentLabel = selectedLabel ?? options.find((option) => option.value === value)?.label ?? ''

  useEffect(() => {
    if (!open || active < 0) return
    const node = listRef.current?.children[active] as HTMLElement | undefined
    node?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active])

  const openList = () => {
    if (disabled || open) return
    setOpen(true)
    onOpen?.()
  }

  const close = () => {
    setOpen(false)
    setText(null)
    setActiveIndex(-1)
    onSearch?.('')
  }

  const select = (option: ComboboxOption) => {
    onChange(option.value)
    close()
  }

  const clear = () => {
    onChange(null)
    setText(null)
    onSearch?.('')
    inputRef.current?.focus()
  }

  const handleBlur = () => {
    if (text !== null && text.trim() === '' && value) onChange(null)
    close()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = visible.length - 1
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) openList()
        else if (visible.length > 0) setActiveIndex(active >= last ? 0 : active + 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!open) openList()
        else if (visible.length > 0) setActiveIndex(active <= 0 ? last : active - 1)
        break
      case 'Home':
        if (open && visible.length > 0) {
          event.preventDefault()
          setActiveIndex(0)
        }
        break
      case 'End':
        if (open && visible.length > 0) {
          event.preventDefault()
          setActiveIndex(last)
        }
        break
      case 'Enter':
        if (open && active >= 0) {
          event.preventDefault()
          select(visible[active]!)
        }
        break
      case 'Escape':
        if (open) {
          event.preventDefault()
          close()
        }
        break
      default:
        break
    }
  }

  const optionId = (index: number) => `${optionIdPrefix}-${index}`
  const showClear = clearable && !disabled && value !== null && text === null

  return (
    <div className={styles.wrap} data-open={open}>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        placeholder={value !== null && text !== null ? currentLabel || placeholder : placeholder}
        className={clsx(inputStyles.control, styles.input)}
        value={text ?? currentLabel}
        onChange={(event) => {
          setText(event.target.value)
          setActiveIndex(event.target.value.trim() ? 0 : -1)
          onSearch?.(event.target.value)
          openList()
        }}
        onFocus={openList}
        onClick={openList}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...aria}
      />
      <span className={styles.adornments}>
        {status === 'loading' && open ? <Icon icon={Loader2} size={16} spin className={styles.spinner} /> : null}
        {showClear ? (
          <button
            type="button"
            tabIndex={-1}
            className={styles.adornment}
            aria-label="Borrar selección"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
          >
            <Icon icon={X} size={16} />
          </button>
        ) : null}
        <button
          type="button"
          tabIndex={-1}
          className={clsx(styles.adornment, styles.chevron)}
          aria-label={open ? 'Cerrar opciones' : 'Mostrar opciones'}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (open) close()
            else {
              inputRef.current?.focus()
              openList()
            }
          }}
        >
          <Icon icon={ChevronDown} size={16} />
        </button>
      </span>
      <div className={styles.popup} hidden={!open}>
        <ul ref={listRef} id={listboxId} role="listbox" className={styles.listbox} aria-label={listLabel}>
          {visible.map((option, index) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                data-active={index === active}
                className={styles.option}
                // Keep the focus on the input, so its blur does not close the list before the click.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(option)}
              >
                <span className={styles.check} aria-hidden="true">
                  {isSelected ? <Icon icon={Check} size={16} /> : null}
                </span>
                <span className={styles.texts}>
                  <span className={styles.label}>
                    <Highlight text={option.label} term={term} />
                  </span>
                  {option.description ? (
                    <span className={styles.description}>
                      <Highlight text={option.description} term={term} />
                    </span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
        {status === 'loading' && visible.length === 0 ? (
          <p role="status" className={styles.message}>
            Buscando…
          </p>
        ) : null}
        {status === 'error' ? (
          <div role="alert" className={styles.message}>
            <span>No se pudieron cargar las opciones.</span>
            {onRetry ? (
              <button
                type="button"
                className={styles.retry}
                onMouseDown={(event) => event.preventDefault()}
                onClick={onRetry}
              >
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}
        {status === 'ready' && visible.length === 0 ? (
          <p role="status" className={styles.message}>
            {emptyMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}
