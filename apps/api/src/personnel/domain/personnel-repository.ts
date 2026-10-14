import type { ListQuery, Paginated, PersonnelImageKind } from '@sryg/types'
import type { NewPersonnel, Personnel, PersonnelChanges } from './personnel'
import type { StoredFile } from './personnel-file'

export interface PersonnelRepository {
  findById(id: string): Promise<Personnel | null>
  list(query: ListQuery): Promise<Paginated<Personnel>>
  /** Throws ConflictError when the cedula already exists. */
  create(data: NewPersonnel, actorId: string): Promise<Personnel>
  /** Throws NotFoundError for an unknown id and ConflictError when the new cedula already exists. */
  update(id: string, changes: PersonnelChanges, actorId: string): Promise<Personnel>
  /** Whether the person holds a license or a medical certificate (BR-10). */
  hasCredentials(id: string): Promise<boolean>
  /** Throws ConflictError when another record still references the person (e.g. a block). */
  delete(id: string): Promise<void>
  /** The photo or signature bytes (D5); null when the person has none. */
  getImage(id: string, kind: PersonnelImageKind): Promise<StoredFile | null>
  setImage(id: string, kind: PersonnelImageKind, image: StoredFile, actorId: string): Promise<Personnel>
}
