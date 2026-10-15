import { PERSONNEL_IMAGE_MAX_BYTES, type PersonnelImageKind } from '@sryg/types'
import sharp, { type Sharp } from 'sharp'
import type { StoredFile } from '../dtos/personnel-file.dto'
import { InvalidPersonnelFileError } from './personnel-errors'

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp'])

// Box each image fits in before compressing: enough for the CR80 card print (W2-2).
const BOX: Record<PersonnelImageKind, { width: number; height: number }> = {
  photo: { width: 600, height: 800 },
  signature: { width: 900, height: 300 },
}

// JPEG qualities tried in turn for a photo; past the last one the image shrinks and retries.
const PHOTO_QUALITIES = [85, 75, 65, 55, 45]
const MIN_SIDE = 64

/**
 * Turns an uploaded image into what the record stores: at most 200 KB, as JPEG (photo) or PNG
 * (signature, keeps transparency) — the formats the credential PDF embeds (D5).
 * Throws InvalidPersonnelFileError('type') when the bytes are not a JPEG, PNG or WebP image.
 */
export class SharpImageCompressor {
  constructor(private readonly maxBytes = PERSONNEL_IMAGE_MAX_BYTES) {}

  async compress(input: Buffer, kind: PersonnelImageKind): Promise<StoredFile> {
    const format = await sharp(input)
      .metadata()
      .then((meta) => meta.format)
      .catch(() => undefined)
    if (!format || !ACCEPTED_FORMATS.has(format)) throw new InvalidPersonnelFileError('type')

    let { width, height } = BOX[kind]
    for (;;) {
      // rotate() applies the EXIF orientation before the metadata is dropped.
      const base = sharp(input).rotate().resize({ width, height, fit: 'inside', withoutEnlargement: true })
      const data = kind === 'photo' ? await this.photo(base) : await this.signature(base)
      if (data.length <= this.maxBytes || Math.min(width, height) <= MIN_SIDE) {
        return { data, mime: kind === 'photo' ? 'image/jpeg' : 'image/png' }
      }
      width = Math.round(width * 0.75)
      height = Math.round(height * 0.75)
    }
  }

  private async photo(base: Sharp): Promise<Buffer> {
    let data = Buffer.alloc(0)
    for (const quality of PHOTO_QUALITIES) {
      data = await base.clone().flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer()
      if (data.length <= this.maxBytes) break
    }
    return data
  }

  private signature(base: Sharp): Promise<Buffer> {
    // Low quantisation effort: higher effort costs seconds for a few bytes less.
    return base.png({ palette: true, compressionLevel: 9, effort: 1 }).toBuffer()
  }
}
