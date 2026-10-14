import { useEffect, useState } from 'react'

/**
 * A `data:` URL for `blob` (images of up to 500 KB, D18), read asynchronously. Unlike an object URL
 * it needs no revocation, so it survives StrictMode's double effects.
 */
export function useDataUrl(blob: Blob | null): string | null {
  const [read, setRead] = useState<{ blob: Blob; href: string } | null>(null)
  useEffect(() => {
    if (!blob) return
    const reader = new FileReader()
    reader.onload = () => setRead({ blob, href: String(reader.result) })
    reader.readAsDataURL(blob)
    return () => {
      reader.onload = null
      reader.abort()
    }
  }, [blob])
  return blob && read?.blob === blob ? read.href : null
}
