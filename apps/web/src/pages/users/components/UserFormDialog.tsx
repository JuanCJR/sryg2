import type { FormEvent } from 'react'
import { ROLES, USER_AREAS } from '@sryg/types'
import { Button, FormField, Input, Notice, Select } from '../../../common/components'
import { AREA_LABEL, ROLE_LABEL } from '../../../common/utils/role-labels'
import type { UserFormIssues, UserFormValues } from '../utils/user-form'
import { UserDialog } from './UserDialog'
import dialogStyles from './UserDialog.module.css'
import styles from './UserFormDialog.module.css'

export interface UserFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  values: UserFormValues
  issues: UserFormIssues
  /** A failure that belongs to no single field (last active Admin, server down). */
  formError: string | null
  submitting: boolean
  onChange: (values: UserFormValues) => void
  onSubmit: () => void
  onCancel: () => void
}

/** Create or edit a user: email (fixed once created), name, role and area (D24). */
export function UserFormDialog({
  open,
  mode,
  values,
  issues,
  formError,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: UserFormDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <UserDialog open={open} title={mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'} onClose={onCancel}>
      <form noValidate onSubmit={handleSubmit} className={styles.form}>
        {formError ? (
          <Notice tone="warning" title="No se guardaron los cambios">
            {formError}
          </Notice>
        ) : null}
        <fieldset className={styles.fields} disabled={submitting}>
          <FormField
            label="Correo"
            error={issues.email}
            hint={mode === 'create' ? 'Con él ingresa al sistema. No se puede cambiar después.' : undefined}
          >
            {(control) => (
              <Input
                {...control}
                type="email"
                autoComplete="off"
                value={values.email}
                disabled={mode === 'edit'}
                onChange={(event) => onChange({ ...values, email: event.target.value })}
              />
            )}
          </FormField>
          <FormField label="Nombre" error={issues.fullName}>
            {(control) => (
              <Input
                {...control}
                autoComplete="off"
                value={values.fullName}
                onChange={(event) => onChange({ ...values, fullName: event.target.value })}
              />
            )}
          </FormField>
          <div className={styles.pair}>
            <FormField label="Rol">
              {(control) => (
                <Select
                  {...control}
                  value={values.role}
                  onChange={(event) => onChange({ ...values, role: event.target.value as UserFormValues['role'] })}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <FormField label="Área" hint="El Supervisor solo escribe en su área.">
              {(control) => (
                <Select
                  {...control}
                  value={values.area}
                  onChange={(event) => onChange({ ...values, area: event.target.value as UserFormValues['area'] })}
                >
                  {USER_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {AREA_LABEL[area]}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
          </div>
        </fieldset>
        <div className={dialogStyles.actions}>
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            {mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </UserDialog>
  )
}
