import { useState } from 'react'
import type { AnyCatalogItemDto, CatalogSlug } from '@sryg/types'
import { Breadcrumb, Button, Pagination, SearchBar, useToast } from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { PATHS } from '../../../app/routes'
import { ListPageTemplate } from '../../../app/templates/ListPageTemplate'
import { ApiError } from '../../../shared/api/fetch-json'
import { useApiResource } from '../../../shared/api/useApiResource'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { CatalogDialog } from '../components/CatalogDialog'
import { CatalogItemForm } from '../components/CatalogItemForm'
import { CatalogItemsTable } from '../components/CatalogItemsTable'
import { createCatalogItem, deleteCatalogItem, listCatalogItems, updateCatalogItem } from '../data/catalog-items-client'
import { CATALOG_META } from '../domain/catalog-meta'
import { EMPTY_FORM, toCreateBody, toFormValues, toUpdateBody, type CatalogItemFormValues } from '../domain/item-form'
import styles from './CatalogContainer.module.css'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const LOAD_ERROR = {
  title: 'No se pudo cargar el catálogo',
  message: 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.',
}
const DUPLICATE_NAME = 'Ya existe un ítem con ese nombre en español.'
const IN_USE = 'El ítem está en uso y no se puede eliminar. Desactívelo para que deje de ofrecerse.'
const SAVE_FAILED = 'No se pudo guardar. Intente de nuevo.'

const isConflict = (error: unknown) => error instanceof ApiError && error.status === 409

type DialogState =
  { kind: 'create' } | { kind: 'edit'; item: AnyCatalogItemDto } | { kind: 'delete'; item: AnyCatalogItemDto } | null

/**
 * Maintenance page of one D19 catalog (like SLYM's): search, pagination and, for the Admin, a
 * dialog to create or edit, plus activate/deactivate and delete. Items in use are deactivated:
 * the API refuses to delete them (409).
 */
export function CatalogContainer({ catalog }: { catalog: CatalogSlug }) {
  const { can } = useRole()
  const toast = useToast()
  const meta = CATALOG_META[catalog]
  const licenseType = catalog === 'license-types'
  const canWrite = can('catalogs', 'write')

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  // Bumped after every write so the list reloads with the server's view.
  const [version, setVersion] = useState(0)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const term = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)

  const results = useApiResource(`catalog:${catalog}:${term}:${page}:${version}`, () =>
    listCatalogItems(catalog, { q: term || undefined, page, pageSize: PAGE_SIZE }),
  )

  const reload = () => setVersion((v) => v + 1)
  const openDialog = (next: DialogState) => {
    setFormError(null)
    setDialog(next)
  }
  const closeDialog = () => {
    if (!saving) setDialog(null)
  }

  const save = async (values: CatalogItemFormValues) => {
    if (!dialog || dialog.kind === 'delete') return
    setSaving(true)
    setFormError(null)
    try {
      if (dialog.kind === 'create') {
        await createCatalogItem(catalog, toCreateBody(values, licenseType))
      } else {
        const body = toUpdateBody(dialog.item, values, licenseType)
        if (Object.keys(body).length > 0) await updateCatalogItem(catalog, dialog.item.id, body)
      }
      toast.show({ tone: 'info', message: dialog.kind === 'create' ? 'Ítem creado.' : 'Ítem actualizado.' })
      setDialog(null)
      reload()
    } catch (error) {
      setFormError(isConflict(error) ? DUPLICATE_NAME : SAVE_FAILED)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: AnyCatalogItemDto) => {
    setBusyId(item.id)
    try {
      await updateCatalogItem(catalog, item.id, { active: !item.active })
      toast.show({ tone: 'info', message: item.active ? 'Ítem desactivado.' : 'Ítem activado.' })
      reload()
    } catch {
      toast.show({ tone: 'error', message: SAVE_FAILED })
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (item: AnyCatalogItemDto) => {
    setSaving(true)
    try {
      await deleteCatalogItem(catalog, item.id)
      toast.show({ tone: 'info', message: 'Ítem eliminado.' })
      reload()
    } catch (error) {
      toast.show({ tone: 'error', message: isConflict(error) ? IN_USE : 'No se pudo eliminar. Intente de nuevo.' })
    } finally {
      setSaving(false)
      setDialog(null)
    }
  }

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setPage(1)
  }

  const common = {
    title: meta.title,
    breadcrumb: (
      <Breadcrumb
        items={[{ label: 'Inicio', href: '/' }, { label: 'Catálogos', href: PATHS.catalogs }, { label: meta.title }]}
      />
    ),
    primaryAction: canWrite ? (
      <Button variant="primary" onClick={() => openDialog({ kind: 'create' })}>
        Nuevo ítem
      </Button>
    ) : undefined,
    toolbar: <SearchBar label="Buscar en el catálogo" value={query} onChange={handleQueryChange} />,
    overlays: (
      <>
        {dialog && dialog.kind !== 'delete' ? (
          <CatalogDialog title={dialog.kind === 'create' ? 'Nuevo ítem' : 'Editar ítem'} onClose={closeDialog}>
            <CatalogItemForm
              initial={dialog.kind === 'edit' ? toFormValues(dialog.item) : EMPTY_FORM}
              licenseType={licenseType}
              validityIsPlaceholder={dialog.kind === 'edit' && dialog.item.validityIsPlaceholder === true}
              submitting={saving}
              error={formError}
              onSubmit={save}
              onCancel={closeDialog}
            />
          </CatalogDialog>
        ) : null}
        {dialog?.kind === 'delete' ? (
          <CatalogDialog title="Eliminar ítem" onClose={closeDialog}>
            <p>
              Se eliminará «{dialog.item.nameEs}» del catálogo. Si algún registro lo usa no se podrá eliminar: en ese
              caso, desactívelo.
            </p>
            <div className={styles.actions}>
              <Button variant="secondary" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button variant="primary" loading={saving} onClick={() => remove(dialog.item)}>
                Eliminar
              </Button>
            </div>
          </CatalogDialog>
        ) : null}
      </>
    ),
  }

  if (results.status === 'loading') {
    return <ListPageTemplate {...common} status="loading" loadingLabel="Cargando catálogo" />
  }

  if (results.status === 'error') {
    return <ListPageTemplate {...common} status="error" error={{ ...LOAD_ERROR, onRetry: results.retry }} />
  }

  if (results.data.total === 0) {
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        empty={
          term
            ? {
                reason: 'no-results',
                title: 'Sin resultados para esta búsqueda',
                message: 'Ningún ítem coincide con el texto escrito, en español ni en inglés.',
              }
            : {
                reason: 'no-data',
                title: 'Este catálogo aún no tiene ítems',
                message: canWrite
                  ? 'Use «Nuevo ítem» para cargar el primero.'
                  : 'Cuando el Administrador cargue ítems aparecerán aquí.',
              }
        }
      />
    )
  }

  const pageCount = Math.max(1, Math.ceil(results.data.total / PAGE_SIZE))
  return (
    <ListPageTemplate
      {...common}
      status="ready"
      summary={
        <p className={styles.summary}>
          {results.data.total} {results.data.total === 1 ? 'ítem' : 'ítems'}
        </p>
      }
      pagination={pageCount > 1 ? <Pagination page={page} pageCount={pageCount} onPageChange={setPage} /> : undefined}
    >
      <CatalogItemsTable
        caption={meta.title}
        items={results.data.items}
        licenseTypes={licenseType}
        actions={
          canWrite
            ? {
                onEdit: (item) => openDialog({ kind: 'edit', item }),
                onToggleActive: toggleActive,
                onDelete: (item) => openDialog({ kind: 'delete', item }),
                busyId,
              }
            : undefined
        }
      />
    </ListPageTemplate>
  )
}
