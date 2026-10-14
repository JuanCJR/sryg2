import type { ListQuery, Paginated } from '@sryg/types'
import type { ManagedUser } from '../domain/managed-user'
import type { UserAdminRepository } from '../domain/user-admin-repository'

export class ListUsersUseCase {
  constructor(private readonly users: UserAdminRepository) {}

  execute(query: ListQuery): Promise<Paginated<ManagedUser>> {
    return this.users.list(query)
  }
}
