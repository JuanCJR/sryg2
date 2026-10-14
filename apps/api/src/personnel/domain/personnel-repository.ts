import type { ListQuery, Paginated } from '@sryg/types'
import type { NewPersonnel, Personnel, PersonnelChanges } from './personnel'

export interface PersonnelRepository {
  findById(id: string): Promise<Personnel | null>
  list(query: ListQuery): Promise<Paginated<Personnel>>
  /** Throws ConflictError when the cedula already exists. */
  create(data: NewPersonnel, actorId: string): Promise<Personnel>
  /** Throws NotFoundError for an unknown id and ConflictError when the new cedula already exists. */
  update(id: string, changes: PersonnelChanges, actorId: string): Promise<Personnel>
}
