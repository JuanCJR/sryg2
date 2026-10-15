import { NotFoundError } from '../../common/errors/domain-errors'
import type { PersonnelRepository } from '../repositories/personnel.repository'
import type { Personnel } from './personnel'

export class GetPersonnelService {
  constructor(private readonly personnel: PersonnelRepository) {}

  async execute(id: string): Promise<Personnel> {
    const found = await this.personnel.findById(id)
    if (!found) throw new NotFoundError('Personnel not found')
    return found
  }
}
