import { posix } from 'node:path'

// Leading bytes of each accepted attachment type (D21). The declared type is never trusted.
const SIGNATURES: Array<[mime: string, bytes: number[]]> = [
  ['application/pdf', [0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  ['image/jpeg', [0xff, 0xd8, 0xff]],
  ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
]

/** The MIME type the bytes really have, among PDF, JPEG and PNG; null for anything else. */
export function sniffAttachmentMime(data: Buffer): string | null {
  const match = SIGNATURES.find(([, bytes]) => bytes.every((byte, index) => data[index] === byte))
  return match?.[0] ?? null
}

const MAX_FILENAME_LENGTH = 200
const FALLBACK_FILENAME = 'documento'

/** The base name the client sent, without directories or control characters. */
export function cleanFilename(original: string): string {
  const printable = [...original].filter((char) => char.charCodeAt(0) > 0x1f && char !== '\u007f').join('')
  const name = posix.basename(printable.replace(/\\/g, '/')).trim()
  return name.slice(-MAX_FILENAME_LENGTH) || FALLBACK_FILENAME
}
