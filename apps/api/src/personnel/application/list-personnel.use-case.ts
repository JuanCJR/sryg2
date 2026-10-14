import type { ListQuery, Paginated } from '@sryg/types'
import type { Personnel } from '../domain/personnel'
import type { PersonnelRepository } from '../domain/personnel-repository'

export class ListPersonnelUseCase {
  constructor(private readonly personnel: PersonnelRepository) {}

  execute(query: ListQuery): Promise<Paginated<Personnel>> {
    return this.personnel.list(query)
  }
}
