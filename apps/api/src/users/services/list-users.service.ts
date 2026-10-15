import type { ListQuery, Paginated } from '@sryg/types'
import type { UserAdminRepository } from '../repositories/user-admin.repository'
import type { ManagedUser } from './managed-user'

export class ListUsersService {
  constructor(private readonly users: UserAdminRepository) {}

  execute(query: ListQuery): Promise<Paginated<ManagedUser>> {
    return this.users.list(query)
  }
}
