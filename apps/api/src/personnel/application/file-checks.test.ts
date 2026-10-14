import { describe, expect, it } from 'vitest'
import { cleanFilename, sniffAttachmentMime } from './file-checks'

describe('sniffAttachmentMime', () => {
  it('recognizes PDF, JPEG and PNG by their leading bytes only', () => {
    expect(sniffAttachmentMime(Buffer.from('%PDF-1.7 ficticio'))).toBe('application/pdf')
    expect(sniffAttachmentMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffAttachmentMime(Buffer.from('89504e470d0a1a0a00', 'hex'))).toBe('image/png')
    expect(sniffAttachmentMime(Buffer.from('GIF89a'))).toBeNull()
    expect(sniffAttachmentMime(Buffer.alloc(0))).toBeNull()
  })
})

describe('cleanFilename', () => {
  it('keeps the base name without directories or control characters', () => {
    expect(cleanFilename('../../etc/passwd.pdf')).toBe('passwd.pdf')
    expect(cleanFilename('C:\\Docs\\cédula.pdf')).toBe('cédula.pdf')
    expect(cleanFilename('a\u0000b\n.pdf')).toBe('ab.pdf')
    expect(cleanFilename('   ')).toBe('documento')
    expect(cleanFilename(`${'x'.repeat(300)}.pdf`)).toHaveLength(200)
    expect(cleanFilename(`${'x'.repeat(300)}.pdf`).endsWith('.pdf')).toBe(true)
  })
})
