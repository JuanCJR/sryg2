import { useState } from 'react'
import type { CatalogOption, CatalogSlug } from '@sryg/types'
import { Combobox } from '..'
import { useApiResource } from '../../hooks/useApiResource'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { fetchCatalogOptions } from '../../services/catalog-options-client'

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
 * Selector with search over a catalog's active items (D19): the design-system `Combobox` fed by a
 * server-side search. Type to search, arrows to move, Enter to pick, Escape to close, × or erasing
 * the text clears the value.
 */
export function CatalogSelect({ catalog, value, onChange, ...rest }: CatalogSelectProps) {
  // The options load the first time the list opens, never on mount.
  const [requested, setRequested] = useState(false)
  const [text, setText] = useState('')
  const term = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS)

  const resource = useApiResource(requested ? `${catalog}:${term}` : null, () =>
    fetchCatalogOptions(catalog, { q: term || undefined, limit: OPTIONS_LIMIT }),
  )
  const items = resource.status === 'ready' ? resource.data : []
  // A typed term the debounce has not caught up with yet still counts as "searching".
  const searching = resource.status === 'loading' || (requested && term !== text.trim())

  return (
    <Combobox
      {...rest}
      options={items.map((item) => ({ value: item.id, label: item.nameEs, description: item.nameEn ?? undefined }))}
      value={value?.id ?? null}
      selectedLabel={value?.nameEs}
      onChange={(id) => onChange(id === null ? null : (items.find((item) => item.id === id) ?? null))}
      onSearch={setText}
      onOpen={() => setRequested(true)}
      status={resource.status === 'error' ? 'error' : searching || resource.status !== 'ready' ? 'loading' : 'ready'}
      onRetry={resource.status === 'error' ? resource.retry : undefined}
    />
  )
}
