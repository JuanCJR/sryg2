import { useEffect, useMemo } from 'react'
import type { PersonnelImageKind } from '@sryg/types'
import { useApiResource } from '../../../common/hooks/useApiResource'
import { fetchPersonnelImage } from '../services/personnel-client'

/** An object URL for `blob`, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined): string | undefined {
  const url = useMemo(
    () => (blob && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : undefined),
    [blob],
  )
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])
  return url
}

/**
 * The stored photo or signature as an object URL (the endpoint needs the Bearer token, so a plain
 * `<img src>` cannot load it). Undefined while loading, when there is none, or when it fails.
 */
export function useStoredImageUrl(
  personId: string,
  kind: PersonnelImageKind,
  exists: boolean,
  version = '',
): string | undefined {
  const resource = useApiResource(exists ? `personnel:${personId}:${kind}:${version}` : null, () =>
    fetchPersonnelImage(personId, kind),
  )
  return useObjectUrl(resource.status === 'ready' ? resource.data : null)
}
