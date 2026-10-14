import { NotFoundError } from '../../shared/domain/errors'
import type { Personnel } from '../domain/personnel'
import type { PersonnelRepository } from '../domain/personnel-repository'

export class GetPersonnelUseCase {
  constructor(private readonly personnel: PersonnelRepository) {}

  async execute(id: string): Promise<Personnel> {
    const found = await this.personnel.findById(id)
    if (!found) throw new NotFoundError('Personnel not found')
    return found
  }
}
