import { ImageOff } from 'lucide-react'
import { Label } from '../../../common/components'
import styles from './HolderImages.module.css'

export interface HolderImagesProps {
  photoUrl?: string
  signatureUrl?: string
  hasPhoto: boolean
  hasSignature: boolean
}

function Frame({
  label,
  alt,
  url,
  exists,
  wide,
}: {
  label: string
  alt: string
  url?: string
  exists: boolean
  wide?: boolean
}) {
  return (
    <figure className={styles.item}>
      <figcaption>
        <Label>{label}</Label>
      </figcaption>
      <div className={wide ? `${styles.frame} ${styles.wide}` : styles.frame}>
        {url ? (
          <img className={styles.image} src={url} alt={alt} />
        ) : (
          <span className={styles.empty}>
            {exists ? (
              'Cargando…'
            ) : (
              <>
                <ImageOff size={18} strokeWidth={1.5} aria-hidden="true" />
                Sin registrar
              </>
            )}
          </span>
        )}
      </div>
    </figure>
  )
}

/** Photo and signature of the holder (D5), as they will print on the credential. */
export function HolderImages({ photoUrl, signatureUrl, hasPhoto, hasSignature }: HolderImagesProps) {
  return (
    <div className={styles.row}>
      <Frame label="Foto" alt="Foto del titular" url={photoUrl} exists={hasPhoto} />
      <Frame label="Firma del titular" alt="Firma del titular" url={signatureUrl} exists={hasSignature} wide />
    </div>
  )
}
