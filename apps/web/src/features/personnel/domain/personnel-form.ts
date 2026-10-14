import {
  type BloodType,
  type CatalogOption,
  checkPersonnelImageFile,
  type CreatePersonnelInput,
  createPersonnelSchema,
  type PersonnelDto,
  type PersonnelImageKind,
  type PersonnelStatus,
  type Rav60Category,
  type UpdatePersonnelInput,
} from '@sryg/types'

/** What the Registro / Editar form holds: text as typed, catalog items as whole options. */
export interface PersonnelFormValues {
  documentType: CatalogOption | null
  cedula: string
  firstNames: string
  lastNames: string
  nationality: CatalogOption | null
  /** ISO `YYYY-MM-DD`, or '' while empty or incomplete. */
  birthDate: string
  email: string
  phone: string
  address: string
  bloodType: BloodType | ''
  cargo: string
  dependencia: string
  category: Rav60Category | ''
  status: PersonnelStatus
}

export type PersonnelFormField = keyof PersonnelFormValues
export type PersonnelFormErrors = Partial<Record<PersonnelFormField | PersonnelImageKind, string>>

export const EMPTY_PERSONNEL_FORM: PersonnelFormValues = {
  documentType: null,
  cedula: '',
  firstNames: '',
  lastNames: '',
  nationality: null,
  birthDate: '',
  email: '',
  phone: '',
  address: '',
  bloodType: '',
  cargo: '',
  dependencia: '',
  category: '',
  status: 'activo',
}

/** The edit form starts from the record; the catalog options were resolved by the container. */
export function formFromPersonnel(
  dto: PersonnelDto,
  catalogs: { documentType: CatalogOption | null; nationality: CatalogOption | null },
): PersonnelFormValues {
  return {
    ...catalogs,
    cedula: dto.cedula,
    firstNames: dto.firstNames,
    lastNames: dto.lastNames,
    birthDate: dto.birthDate ?? '',
    email: dto.email ?? '',
    phone: dto.phone ?? '',
    address: dto.address ?? '',
    bloodType: dto.bloodType ?? '',
    cargo: dto.cargo ?? '',
    dependencia: dto.dependencia ?? '',
    category: dto.category ?? '',
    status: dto.status,
  }
}

const MESSAGES: Partial<Record<string, string>> = {
  cedula: 'Ingrese un número de documento de 6 a 9 dígitos.',
  firstNames: 'Ingrese los nombres.',
  lastNames: 'Ingrese los apellidos.',
  email: 'Ingrese un correo válido.',
  address: 'Ingrese una dirección de hasta 500 caracteres.',
}
const FALLBACK_MESSAGE = 'Revise este valor.'

/** API field name (and zod path) → form field. */
const FIELD_OF: Record<string, PersonnelFormField> = {
  documentTypeId: 'documentType',
  nationalityId: 'nationality',
}

export const messageFor = (path: string) => MESSAGES[path] ?? FALLBACK_MESSAGE
export const fieldFor = (path: string): PersonnelFormField => FIELD_OF[path] ?? (path as PersonnelFormField)

const orNull = (value: string) => (value.trim() ? value.trim() : null)

/** Every writable field, '' and empty selections as null (the shape PATCH compares against). */
function toPayload(values: PersonnelFormValues) {
  return {
    cedula: values.cedula,
    firstNames: values.firstNames,
    lastNames: values.lastNames,
    documentTypeId: values.documentType?.id ?? null,
    nationalityId: values.nationality?.id ?? null,
    birthDate: values.birthDate || null,
    email: orNull(values.email),
    phone: orNull(values.phone),
    address: orNull(values.address),
    bloodType: values.bloodType || null,
    cargo: orNull(values.cargo),
    dependencia: orNull(values.dependencia),
    category: values.category || null,
    status: values.status,
  } satisfies CreatePersonnelInput
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: PersonnelFormErrors }

/** Validates with the API's own contract (D21), with Spanish messages per field. */
function validate(values: PersonnelFormValues): PersonnelFormErrors {
  const result = createPersonnelSchema.safeParse(toPayload(values))
  const errors: PersonnelFormErrors = {}
  if (result.success) return errors
  for (const issue of result.error.issues) {
    const path = String(issue.path[0] ?? '')
    errors[fieldFor(path)] ??= messageFor(path)
  }
  return errors
}

/** The POST body: empty optional fields are left out; the API fills its defaults. */
export function toCreateInput(values: PersonnelFormValues): ValidationResult<CreatePersonnelInput> {
  const errors = validate(values)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const payload: Record<string, unknown> = toPayload(values)
  for (const [key, value] of Object.entries(payload)) if (value === null) delete payload[key]
  if (payload.status === 'activo') delete payload.status
  return { ok: true, value: payload as CreatePersonnelInput }
}

/** The PATCH body: only what differs from the record (null clears a field). */
export function toUpdateInput(
  values: PersonnelFormValues,
  dto: PersonnelDto,
): ValidationResult<UpdatePersonnelInput | null> {
  const errors = validate(values)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const changes: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(toPayload(values))) {
    if (value !== dto[key as keyof PersonnelDto]) changes[key] = value
  }
  return { ok: true, value: Object.keys(changes).length > 0 ? (changes as UpdatePersonnelInput) : null }
}

const IMAGE_MESSAGES = {
  type: 'Use una imagen JPEG, PNG o WebP.',
  size: 'La imagen supera los 5 MB.',
  empty: 'El archivo está vacío.',
}

/** Null when the file can go to the server, which compresses it (D5); otherwise why not. */
export function imageFileError(file: File): string | null {
  const problem = checkPersonnelImageFile({ mime: file.type, size: file.size })
  return problem ? IMAGE_MESSAGES[problem] : null
}
