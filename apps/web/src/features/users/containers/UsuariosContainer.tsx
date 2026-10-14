import { useState } from 'react'
import type { ManagedUser } from '@sryg/types'
import { Breadcrumb, Button, ConfirmDialog, Pagination, SearchBar, useToast } from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { HOME } from '../../../app/routes'
import { ListPageTemplate } from '../../../app/templates/ListPageTemplate'
import { ApiError } from '../../../shared/api/fetch-json'
import { useApiResource } from '../../../shared/api/useApiResource'
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue'
import { TemporaryPasswordDialog } from '../components/TemporaryPasswordDialog'
import { UserFormDialog } from '../components/UserFormDialog'
import { UsersTable } from '../components/UsersTable'
import { createUser, listUsers, resetUserPassword, setUserActive, updateUser } from '../data/users-client'
import {
  EMAIL_IN_USE,
  EMPTY_USER_FORM,
  LAST_ADMIN_DEACTIVATE,
  LAST_ADMIN_DEMOTE,
  toFormValues,
  type UserFormIssues,
  type UserFormValues,
  validateUserForm,
} from '../domain/user-form'

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300
const SERVER_DOWN = 'El servidor no respondió. Revise la conexión a la red local e intente de nuevo.'

interface FormState {
  mode: 'create' | 'edit'
  target: ManagedUser | null
  values: UserFormValues
  issues: UserFormIssues
  formError: string | null
  submitting: boolean
}

type Pending = { kind: 'reset' | 'deactivate'; user: ManagedUser }

const isConflict = (error: unknown) => error instanceof ApiError && error.status === 409

/**
 * Usuarios (AUTH-06, page 11), Admin only (D1): list, create and edit (dialog), activate or
 * deactivate and reset the password. Create and reset show the temporary password once (D14).
 */
export function UsuariosContainer() {
  const { user: me, reload } = useRole()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [form, setForm] = useState<FormState | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const term = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS)
  const users = useApiResource(`users:${term}:${page}`, () =>
    listUsers({ q: term || undefined, page, pageSize: PAGE_SIZE }),
  )

  const refresh = (changed?: ManagedUser) => {
    if (users.status !== 'loading') users.retry()
    // The Admin edited their own account: the session's name, role and area follow.
    if (changed && changed.id === me?.id) reload()
  }

  const openCreate = () =>
    setForm({ mode: 'create', target: null, values: EMPTY_USER_FORM, issues: {}, formError: null, submitting: false })
  const openEdit = (target: ManagedUser) =>
    setForm({ mode: 'edit', target, values: toFormValues(target), issues: {}, formError: null, submitting: false })

  const submitForm = async () => {
    if (!form) return
    const issues = validateUserForm(form.values, form.mode)
    if (Object.keys(issues).length > 0) return setForm({ ...form, issues, formError: null })
    setForm({ ...form, issues: {}, formError: null, submitting: true })
    const { email, fullName, role, area } = form.values
    try {
      if (form.mode === 'create') {
        const created = await createUser({ email: email.trim(), fullName: fullName.trim(), role, area })
        setForm(null)
        setCredentials({ email: created.user.email, password: created.temporaryPassword })
        refresh()
      } else if (form.target) {
        const updated = await updateUser(form.target.id, { fullName: fullName.trim(), role, area })
        setForm(null)
        toast.show({ tone: 'info', message: 'Usuario actualizado.' })
        refresh(updated)
      }
    } catch (error) {
      const conflict = isConflict(error)
      setForm({
        ...form,
        submitting: false,
        issues: conflict && form.mode === 'create' ? { email: EMAIL_IN_USE } : {},
        formError: conflict ? (form.mode === 'create' ? null : LAST_ADMIN_DEMOTE) : SERVER_DOWN,
      })
    }
  }

  const resetPassword = async (target: ManagedUser) => {
    setPending(null)
    try {
      const { user, temporaryPassword } = await resetUserPassword(target.id)
      setCredentials({ email: user.email, password: temporaryPassword })
      refresh()
    } catch {
      toast.show({ tone: 'error', message: `No se pudo restablecer la contraseña. ${SERVER_DOWN}` })
    }
  }

  const setActive = async (target: ManagedUser, active: boolean) => {
    setPending(null)
    try {
      const updated = await setUserActive(target.id, active)
      toast.show({ tone: 'info', message: active ? 'Usuario activado.' : 'Usuario desactivado.' })
      refresh(updated)
    } catch (error) {
      toast.show({ tone: 'error', message: isConflict(error) ? LAST_ADMIN_DEACTIVATE : SERVER_DOWN })
    }
  }

  const breadcrumb = <Breadcrumb items={[{ label: 'Inicio', href: HOME.path }, { label: 'Usuarios' }]} />
  const primaryAction = (
    <Button variant="primary" onClick={openCreate}>
      Nuevo usuario
    </Button>
  )
  const toolbar = (
    <SearchBar
      label="Buscar por nombre o correo"
      placeholder="Nombre o correo…"
      value={query}
      onChange={(value) => {
        setQuery(value)
        setPage(1)
      }}
    />
  )
  const overlays = (
    <>
      {form ? (
        <UserFormDialog
          open
          mode={form.mode}
          values={form.values}
          issues={form.issues}
          formError={form.formError}
          submitting={form.submitting}
          onChange={(values) => setForm({ ...form, values, issues: {} })}
          onSubmit={submitForm}
          onCancel={() => setForm(null)}
        />
      ) : null}
      <ConfirmDialog
        open={pending?.kind === 'reset'}
        title="Restablecer contraseña"
        consequence={`La contraseña de ${pending?.user.fullName ?? ''} dejará de funcionar. Se generará una temporal que deberá cambiar en su próximo ingreso.`}
        confirmLabel="Restablecer"
        onConfirm={() => pending && resetPassword(pending.user)}
        onCancel={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending?.kind === 'deactivate'}
        title="Desactivar usuario"
        consequence={`${pending?.user.fullName ?? ''} no podrá ingresar al sistema hasta que se lo active de nuevo.`}
        confirmLabel="Desactivar"
        onConfirm={() => pending && setActive(pending.user, false)}
        onCancel={() => setPending(null)}
      />
      <TemporaryPasswordDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </>
  )
  const common = { title: 'Usuarios', breadcrumb, primaryAction, toolbar, overlays }

  if (users.status === 'loading')
    return <ListPageTemplate {...common} status="loading" loadingLabel="Cargando usuarios" />
  if (users.status === 'error')
    return (
      <ListPageTemplate
        {...common}
        status="error"
        error={{ title: 'No se pudieron cargar los usuarios', message: SERVER_DOWN, onRetry: users.retry }}
      />
    )
  if (users.data.total === 0)
    return (
      <ListPageTemplate
        {...common}
        status="empty"
        empty={
          term
            ? {
                reason: 'no-results',
                title: 'Sin resultados para esta búsqueda',
                message: 'Ningún usuario coincide con el nombre o el correo escritos.',
              }
            : { reason: 'no-data', title: 'Aún no hay usuarios', message: 'Cree el primero con «Nuevo usuario».' }
        }
      />
    )

  const pageCount = Math.max(1, Math.ceil(users.data.total / PAGE_SIZE))
  return (
    <ListPageTemplate
      {...common}
      status="ready"
      summary={<span>{users.data.total === 1 ? '1 usuario' : `${users.data.total} usuarios`}</span>}
      pagination={pageCount > 1 ? <Pagination page={page} pageCount={pageCount} onPageChange={setPage} /> : undefined}
    >
      <UsersTable
        users={users.data.items}
        onEdit={openEdit}
        onResetPassword={(user) => setPending({ kind: 'reset', user })}
        onToggleActive={(user) => (user.isActive ? setPending({ kind: 'deactivate', user }) : setActive(user, true))}
      />
    </ListPageTemplate>
  )
}
