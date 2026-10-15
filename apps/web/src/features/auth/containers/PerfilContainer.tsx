import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Breadcrumb, Button, Notice, useToast } from '../../../design-system'
import { useRole } from '../../../app/role/useRole'
import { HOME, PATHS } from '../../../app/routes'
import { FormPageTemplate } from '../../../app/templates/FormPageTemplate'
import { FormSection } from '../../../app/templates/FormSection'
import { ApiError } from '../../../shared/api/fetch-json'
import { useApiResource } from '../../../shared/api/useApiResource'
import { AccessLogPanel } from '../components/AccessLogPanel'
import { AccountSummary } from '../components/AccountSummary'
import { PasswordChangeFields } from '../components/PasswordChangeFields'
import { changePassword, getAccessLog } from '../data/account-client'
import {
  type PasswordChangeForm,
  type PasswordChangeIssues,
  validatePasswordChange,
  WRONG_CURRENT_PASSWORD,
} from '../domain/password-change'

const BLANK: PasswordChangeForm = { current: '', next: '', confirm: '' }

/**
 * Perfil (AUTH-08, page 14): the user's own account data, the password change (D4) and the access
 * log (D23). After an Admin reset (or on the first sign-in) the session gate keeps the user here
 * until the change is done; reloading `/me` then releases them and they land on the panel.
 */
export function PerfilContainer() {
  const { user, reload } = useRole()
  const navigate = useNavigate()
  const toast = useToast()
  const [values, setValues] = useState(BLANK)
  const [issues, setIssues] = useState<PasswordChangeIssues>({})
  const [failure, setFailure] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const log = useApiResource(user ? `access-log:${user.id}` : null, getAccessLog)

  // The session gate renders this page only with a loaded user.
  if (!user) return null

  const handleChange = (field: keyof PasswordChangeForm, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setIssues((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFailure(false)
    const found = validatePasswordChange(values)
    setIssues(found)
    if (Object.keys(found).length > 0) return
    setSubmitting(true)
    try {
      await changePassword({ currentPassword: values.current, newPassword: values.next })
      setValues(BLANK)
      toast.show({ tone: 'info', message: 'Contraseña actualizada.' })
      // Clears mustChangePassword in the session (D4).
      reload()
      // A forced change was the only thing between the user and the app: take them to it.
      if (user.mustChangePassword) navigate(PATHS.panel, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) setIssues({ current: WRONG_CURRENT_PASSWORD })
      else setFailure(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormPageTemplate
      title="Perfil"
      breadcrumb={<Breadcrumb items={[{ label: 'Inicio', href: HOME.path }, { label: 'Perfil' }]} />}
      status={submitting ? 'submitting' : 'editing'}
      onSubmit={handleSubmit}
      errorSummary={
        failure ? (
          <Notice tone="warning" title="No se pudo cambiar la contraseña">
            El servidor no respondió. Revise la conexión a la red local e intente de nuevo.
          </Notice>
        ) : undefined
      }
      actions={
        <Button type="submit" loading={submitting}>
          Cambiar contraseña
        </Button>
      }
    >
      <FormSection legend="Cuenta">
        <AccountSummary user={user} />
      </FormSection>
      <FormSection legend="Contraseña">
        {user.mustChangePassword ? (
          <Notice tone="caution" title="Debe cambiar su contraseña">
            Su contraseña es temporal (primer ingreso o restablecida por el Administrador). Elija una nueva para seguir usando el sistema.
          </Notice>
        ) : null}
        <PasswordChangeFields values={values} issues={issues} onChange={handleChange} />
      </FormSection>
      <FormSection
        legend="Registro de accesos"
        description="Sus últimos ingresos y los intentos fallidos con su correo."
      >
        <AccessLogPanel log={log} />
      </FormSection>
    </FormPageTemplate>
  )
}
