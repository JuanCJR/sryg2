import { describe, expect, it } from 'vitest'
import {
  ATTACHMENT_MAX_BYTES,
  attachmentUploadSchema,
  checkAttachmentFile,
  checkPersonnelImageFile,
  createPersonnelSchema,
  PERSONNEL_IMAGE_KINDS,
  PERSONNEL_IMAGE_MAX_BYTES,
  PERSONNEL_IMAGE_UPLOAD_MAX_BYTES,
  personnelAttachmentSchema,
  updatePersonnelSchema,
} from './personnel'

const base = { cedula: 'V-12.345.678', firstNames: 'Ana María', lastNames: 'Pérez Gómez' }

describe('createPersonnelSchema', () => {
  it('normalizes the cedula to digits only and keeps names, birth date and address', () => {
    const parsed = createPersonnelSchema.parse({ ...base, birthDate: '1990-05-01', address: 'Calle 1, Maracay' })
    expect(parsed).toMatchObject({
      cedula: '12345678',
      firstNames: 'Ana María',
      lastNames: 'Pérez Gómez',
      birthDate: '1990-05-01',
      address: 'Calle 1, Maracay',
    })
  })

  it('requires cedula, first names and last names', () => {
    expect(createPersonnelSchema.safeParse({ ...base, cedula: undefined }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, cedula: '123' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, firstNames: '  ' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, lastNames: undefined }).success).toBe(false)
  })

  it('validates catalog ids, birth date and enums', () => {
    expect(createPersonnelSchema.safeParse({ ...base, documentTypeId: 'x' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, nationalityId: 'x' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, birthDate: '01/05/1990' }).success).toBe(false)
    expect(createPersonnelSchema.safeParse({ ...base, category: 'astronauta' }).success).toBe(false)
    const ids = { documentTypeId: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11', nationalityId: null }
    expect(createPersonnelSchema.parse({ ...base, ...ids })).toMatchObject(ids)
  })

  it('ignores server-managed fields such as the photo and the signature', () => {
    const parsed = createPersonnelSchema.parse({ ...base, id: 'x', fullName: 'y', photo: 'z', signatureMime: 'w' })
    for (const key of ['id', 'fullName', 'photo', 'signatureMime']) expect(parsed).not.toHaveProperty(key)
  })
})

describe('updatePersonnelSchema', () => {
  it('accepts a partial body and normalizes a provided cedula', () => {
    expect(updatePersonnelSchema.parse({ cedula: 'v 9.876.543' })).toEqual({ cedula: '9876543' })
    expect(updatePersonnelSchema.parse({ cargo: null })).toEqual({ cargo: null })
  })

  it('rejects an empty body', () => {
    expect(updatePersonnelSchema.safeParse({}).success).toBe(false)
  })
})

describe('attachment contracts (D21)', () => {
  it('accepts PDF and images up to 5 MB and names the problem otherwise', () => {
    expect(ATTACHMENT_MAX_BYTES).toBe(5 * 1024 * 1024)
    expect(checkAttachmentFile({ mime: 'application/pdf', size: 1024 })).toBeNull()
    expect(checkAttachmentFile({ mime: 'image/jpeg', size: ATTACHMENT_MAX_BYTES })).toBeNull()
    expect(checkAttachmentFile({ mime: 'image/png', size: 10 })).toBeNull()
    expect(checkAttachmentFile({ mime: 'application/zip', size: 10 })).toBe('type')
    expect(checkAttachmentFile({ mime: 'application/pdf', size: ATTACHMENT_MAX_BYTES + 1 })).toBe('size')
    expect(checkAttachmentFile({ mime: 'application/pdf', size: 0 })).toBe('empty')
  })

  it('requires the catalog attachment type on upload', () => {
    expect(attachmentUploadSchema.safeParse({}).success).toBe(false)
    expect(attachmentUploadSchema.safeParse({ attachmentTypeId: 'x' }).success).toBe(false)
    const id = '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11'
    expect(attachmentUploadSchema.parse({ attachmentTypeId: id, extra: 1 })).toEqual({ attachmentTypeId: id })
  })

  it('describes a stored attachment without its bytes', () => {
    const dto = {
      id: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b11',
      personalId: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b12',
      attachmentTypeId: '6f1d6c0e-2b8a-4a41-9c3e-0d4a3a8f6b13',
      attachmentTypeName: 'Cédula de identidad',
      filename: 'cedula.pdf',
      mime: 'application/pdf',
      size: 2048,
      createdAt: '2026-10-01T12:00:00.000Z',
    }
    expect(personnelAttachmentSchema.parse({ ...dto, data: 'x' })).toEqual(dto)
  })
})

describe('photo and signature contracts (D5)', () => {
  it('stores images of 200 KB at most and accepts JPEG, PNG and WebP uploads', () => {
    expect(PERSONNEL_IMAGE_MAX_BYTES).toBe(200 * 1024)
    expect(PERSONNEL_IMAGE_KINDS).toEqual(['photo', 'signature'])
    expect(checkPersonnelImageFile({ mime: 'image/webp', size: 1 })).toBeNull()
    expect(checkPersonnelImageFile({ mime: 'application/pdf', size: 1 })).toBe('type')
    expect(checkPersonnelImageFile({ mime: 'image/png', size: PERSONNEL_IMAGE_UPLOAD_MAX_BYTES + 1 })).toBe('size')
  })
})
