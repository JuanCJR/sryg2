import { createUserSchema, type ManagedUser, type Role, type UserArea } from '@sryg/types'

export interface UserFormValues {
  email: string
  fullName: string
  role: Role
  area: UserArea
}

export interface UserFormIssues {
  email?: string
  fullName?: string
}

export const EMPTY_USER_FORM: UserFormValues = { email: '', fullName: '', role: 'consulta', area: 'ambas' }

export const toFormValues = ({ email, fullName, role, area }: ManagedUser): UserFormValues => ({
  email,
  fullName,
  role,
  area,
})

/** Client-side check before any request; the email format reuses the API contract's own rule. */
export function validateUserForm(values: UserFormValues, mode: 'create' | 'edit'): UserFormIssues {
  const issues: UserFormIssues = {}
  if (mode === 'create' && !createUserSchema.shape.email.safeParse(values.email.trim()).success)
    issues.email = 'Ingrese un correo válido.'
  if (values.fullName.trim() === '') issues.fullName = 'Ingrese el nombre.'
  return issues
}

export const EMAIL_IN_USE = 'Ya existe un usuario con este correo.'
export const LAST_ADMIN_DEMOTE =
  'No se puede quitar el rol de Administrador al último Administrador activo. Asigne antes ese rol a otro usuario.'
export const LAST_ADMIN_DEACTIVATE =
  'No se puede desactivar al último Administrador activo. Asigne antes ese rol a otro usuario.'
