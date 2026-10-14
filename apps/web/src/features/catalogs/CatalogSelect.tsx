import { useId, useState, type KeyboardEvent } from 'react'
import type { CatalogOption, CatalogSlug } from '@sryg/types'
import { Button, Input } from '../../design-system'
import { useApiResource } from '../../shared/api/useApiResource'
import { useDebouncedValue } from '../../shared/hooks/useDebouncedValue'
import { fetchCatalogOptions } from './data/catalog-options-client'
import styles from './CatalogSelect.module.css'

const SEARCH_DEBOUNCE_MS = 250
const OPTIONS_LIMIT = 20

export interface CatalogSelectProps {
  /** Which D19 catalog to search (`/api/catalogs/:catalog/options`). */
  catalog: CatalogSlug
  /** The selected item. The form keeps the whole option, so the label shows without another request. */
  value: CatalogOption | null
  onChange: (option: CatalogOption | null) => void
  /** From `FormField` (label, hint and error wiring), or set directly. */
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  'aria-label'?: string
  disabled?: boolean
  placeholder?: string
}

/**
 * Selector with search over a catalog's active items (D19), for the wave-1 forms. An ARIA 1.2
 * combobox: type to search on the server, arrows to move, Enter to pick, Escape to close; erasing
 * the text clears the value.
 */
export function CatalogSelect({
  catalog,
  value,
  onChange,
  id,
  disabled = false,
  placeholder = 'Escriba para buscar…',
  ...aria
}: CatalogSelectProps) {
  const listboxId = useId()
  const optionIdPrefix = useId()
  const [open, setOpen] = useState(false)
  // Null while the user is not editing: the input then shows the selected value.
  const [text, setText] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const term = useDebouncedValue((text ?? '').trim(), SEARCH_DEBOUNCE_MS)

  const resource = useApiResource(open ? `${catalog}:${term}` : null, () =>
    fetchCatalogOptions(catalog, { q: term || undefined, limit: OPTIONS_LIMIT }),
  )
  const options = resource.status === 'ready' ? resource.data : []
  const active = activeIndex >= 0 && activeIndex < options.length ? activeIndex : -1

  const close = () => {
    setOpen(false)
    setText(null)
    setActiveIndex(-1)
  }

  const select = (option: CatalogOption) => {
    onChange(option)
    close()
  }

  const handleBlur = () => {
    if (text !== null && text.trim() === '' && value) onChange(null)
    close()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!open) setOpen(true)
        else if (options.length > 0) setActiveIndex((active + 1) % options.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (open && options.length > 0) setActiveIndex(active <= 0 ? options.length - 1 : active - 1)
        break
      case 'Enter':
        if (open && active >= 0) {
          event.preventDefault()
          select(options[active]!)
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

  return (
    <div className={styles.wrap}>
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={text ?? value?.nameEs ?? ''}
        onChange={(event) => {
          setText(event.target.value)
          setActiveIndex(-1)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        {...aria}
      />
      <div className={styles.popup} hidden={!open}>
        <ul id={listboxId} role="listbox" className={styles.listbox} aria-label="Opciones">
          {options.map((option, index) => (
            <li
              key={option.id}
              id={optionId(index)}
              role="option"
              aria-selected={value?.id === option.id}
              data-active={index === active}
              className={styles.option}
              // Keep the focus on the input, so its blur does not close the list before the click.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
            >
              <span className={styles.nameEs}>{option.nameEs}</span>
              {option.nameEn ? <span className={styles.nameEn}>{option.nameEn}</span> : null}
            </li>
          ))}
        </ul>
        {resource.status === 'loading' ? (
          <p role="status" className={styles.message}>
            Buscando…
          </p>
        ) : null}
        {resource.status === 'error' ? (
          <div role="alert" className={styles.message}>
            <span>No se pudieron cargar las opciones.</span>
            <Button
              variant="secondary"
              size="sm"
              onMouseDown={(event) => event.preventDefault()}
              onClick={resource.retry}
            >
              Reintentar
            </Button>
          </div>
        ) : null}
        {resource.status === 'ready' && options.length === 0 ? (
          <p role="status" className={styles.message}>
            Sin coincidencias
          </p>
        ) : null}
      </div>
    </div>
  )
}
