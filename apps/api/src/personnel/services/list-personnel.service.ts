import type { ListQuery, Paginated } from '@sryg/types'
import type { PersonnelRepository } from '../repositories/personnel.repository'
import type { Personnel } from './personnel'

export class ListPersonnelService {
  constructor(private readonly personnel: PersonnelRepository) {}

  execute(query: ListQuery): Promise<Paginated<Personnel>> {
    return this.personnel.list(query)
  }
}
