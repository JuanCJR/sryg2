import type { ExpedienteSlotProps } from '../../../app/expediente/types'
import { DatosPanel } from '../components/DatosPanel'
import { HolderImages } from '../components/HolderImages'
import { useStoredImageUrl } from '../containers/useObjectUrl'
import { toPersonView } from '../domain/person-view'

/** Datos page key: the person's record (D21 fields) plus the photo and signature (D5). */
export function DatosTab({ person }: ExpedienteSlotProps) {
  // `updatedAt` changes on every PUT, so a replaced image is fetched again.
  const photoUrl = useStoredImageUrl(person.id, 'photo', person.hasPhoto, person.updatedAt)
  const signatureUrl = useStoredImageUrl(person.id, 'signature', person.hasSignature, person.updatedAt)
  return (
    <>
      <DatosPanel person={toPersonView(person)} />
      <HolderImages
        photoUrl={photoUrl}
        signatureUrl={signatureUrl}
        hasPhoto={person.hasPhoto}
        hasSignature={person.hasSignature}
      />
    </>
  )
}
