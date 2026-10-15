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
