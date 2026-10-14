import { FormField, Input } from '../../../design-system'
import type { PasswordChangeForm, PasswordChangeIssues } from '../domain/password-change'

export interface PasswordChangeFieldsProps {
  values: PasswordChangeForm
  issues: PasswordChangeIssues
  onChange: (field: keyof PasswordChangeForm, value: string) => void
}

const FIELDS: Array<{ field: keyof PasswordChangeForm; label: string; hint?: string; autoComplete: string }> = [
  { field: 'current', label: 'Contraseña actual', autoComplete: 'current-password' },
  { field: 'next', label: 'Nueva contraseña', hint: 'Mínimo 10 caracteres.', autoComplete: 'new-password' },
  { field: 'confirm', label: 'Confirmar nueva contraseña', autoComplete: 'new-password' },
]

/** The three password inputs of /perfil (AUTH-08). */
export function PasswordChangeFields({ values, issues, onChange }: PasswordChangeFieldsProps) {
  return (
    <>
      {FIELDS.map(({ field, label, hint, autoComplete }) => (
        <FormField key={field} label={label} hint={hint} error={issues[field]}>
          {(control) => (
            <Input
              {...control}
              type="password"
              autoComplete={autoComplete}
              value={values[field]}
              onChange={(event) => onChange(field, event.target.value)}
            />
          )}
        </FormField>
      ))}
    </>
  )
}
