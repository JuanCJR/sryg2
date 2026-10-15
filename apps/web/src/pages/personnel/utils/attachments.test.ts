import { describe, expect, it } from 'vitest'
import { attachmentFileError, formatFileSize } from './attachments'

describe('attachmentFileError', () => {
  it('accepts PDF and images up to 5 MB', () => {
    expect(attachmentFileError(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBeNull()
    expect(attachmentFileError(new File(['x'], 'a.gif', { type: 'image/gif' }))).toBe(
      'Solo se aceptan PDF, JPEG o PNG.',
    )
    expect(attachmentFileError(new File([], 'a.png', { type: 'image/png' }))).toBe('El archivo está vacío.')
  })
})

describe('formatFileSize', () => {
  it('uses bytes, KB or MB with a decimal comma', () => {
    expect(formatFileSize(850)).toBe('850 B')
    expect(formatFileSize(2560)).toBe('2,5 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
  })
})
