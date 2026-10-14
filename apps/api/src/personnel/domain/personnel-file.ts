import type { PersonnelImageKind } from '@sryg/types'

/** Bytes plus their MIME type, as stored in `bytea` (D5, D21). */
export interface StoredFile {
  data: Buffer
  mime: string
}

/** A file received over HTTP, before any check. */
export interface IncomingFile {
  buffer: Buffer
  /** Declared by the client; never trusted alone. */
  mimetype: string
  originalname: string
  size: number
}

/**
 * Turns an uploaded image into what the record stores: at most 200 KB, as JPEG (photo) or PNG
 * (signature, keeps transparency) — the formats the credential PDF embeds (D5).
 * Throws InvalidPersonnelFileError('type') when the bytes are not a JPEG, PNG or WebP image.
 */
export interface ImageCompressor {
  compress(input: Buffer, kind: PersonnelImageKind): Promise<StoredFile>
}
