import { z } from 'zod'
import { cedulaSchema } from './cedula'
import { BLOOD_TYPES, PERSONNEL_STATUSES, RAV60_CATEGORIES } from './enums'

const text = z.string().trim().min(1).max(200)
export const isoDateSchema = z.iso.date()

export const personnelSchema = z.object({
  id: z.uuid(),
  cedula: z.string(),
  firstNames: z.string(),
  lastNames: z.string(),
  documentTypeId: z.uuid().nullable(),
  nationalityId: z.uuid().nullable(),
  birthDate: isoDateSchema.nullable(),
  address: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  bloodType: z.enum(BLOOD_TYPES).nullable(),
  cargo: z.string().nullable(),
  dependencia: z.string().nullable(),
  category: z.enum(RAV60_CATEGORIES).nullable(),
  status: z.enum(PERSONNEL_STATUSES),
  /** The images themselves are served by their own endpoints (D5, W1-4), never inlined. */
  hasPhoto: z.boolean(),
  hasSignature: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type PersonnelDto = z.infer<typeof personnelSchema>

/** Writable fields (D21). Photo, signature, ids and timestamps are server-managed and silently dropped. */
export const createPersonnelSchema = z.object({
  cedula: cedulaSchema,
  firstNames: text,
  lastNames: text,
  documentTypeId: z.uuid().nullish(),
  nationalityId: z.uuid().nullish(),
  birthDate: isoDateSchema.nullish(),
  address: z.string().trim().min(1).max(500).nullish(),
  email: z.email().nullish(),
  phone: text.nullish(),
  bloodType: z.enum(BLOOD_TYPES).nullish(),
  cargo: text.nullish(),
  dependencia: text.nullish(),
  category: z.enum(RAV60_CATEGORIES).nullish(),
  status: z.enum(PERSONNEL_STATUSES).optional(),
})
export type CreatePersonnelInput = z.infer<typeof createPersonnelSchema>

export const updatePersonnelSchema = createPersonnelSchema
  .partial()
  .refine((body) => Object.keys(body).length > 0, 'At least one field is required')
export type UpdatePersonnelInput = z.infer<typeof updatePersonnelSchema>

/** Why a file cannot be stored: wrong type, over the size limit, or empty. */
export type FileCheckProblem = 'type' | 'size' | 'empty'

function checkFile(
  { mime, size }: { mime: string; size: number },
  mimes: readonly string[],
  maxBytes: number,
): FileCheckProblem | null {
  if (!mimes.includes(mime)) return 'type'
  if (size <= 0) return 'empty'
  if (size > maxBytes) return 'size'
  return null
}

// Photo and signature of the holder (D5): stored compressed to 200 KB at most, as JPEG or PNG
// (the formats the credential PDF embeds). Uploads may be larger; the API compresses them.
export const PERSONNEL_IMAGE_KINDS = ['photo', 'signature'] as const
export type PersonnelImageKind = (typeof PERSONNEL_IMAGE_KINDS)[number]
export const PERSONNEL_IMAGE_MAX_BYTES = 200 * 1024
export const PERSONNEL_IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024
export const PERSONNEL_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export function checkPersonnelImageFile(file: { mime: string; size: number }): FileCheckProblem | null {
  return checkFile(file, PERSONNEL_IMAGE_MIME_TYPES, PERSONNEL_IMAGE_UPLOAD_MAX_BYTES)
}

// Documents attached to the person's file (D21): PDF or image up to 5 MB, typed from the catalog.
export const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024
export const ATTACHMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

export function checkAttachmentFile(file: { mime: string; size: number }): FileCheckProblem | null {
  return checkFile(file, ATTACHMENT_MIME_TYPES, ATTACHMENT_MAX_BYTES)
}

/** Multipart fields that go with the `file` part of `POST /api/personnel/:id/attachments`. */
export const attachmentUploadSchema = z.object({ attachmentTypeId: z.uuid() })
export type AttachmentUploadInput = z.infer<typeof attachmentUploadSchema>

/** An attachment as listed; the bytes are downloaded from its own endpoint. */
export const personnelAttachmentSchema = z.object({
  id: z.uuid(),
  personalId: z.uuid(),
  attachmentTypeId: z.uuid(),
  /** Spanish name of the catalog attachment type. */
  attachmentTypeName: z.string(),
  filename: z.string(),
  mime: z.string(),
  size: z.number().int(),
  createdAt: z.iso.datetime(),
})
export type PersonnelAttachmentDto = z.infer<typeof personnelAttachmentSchema>
