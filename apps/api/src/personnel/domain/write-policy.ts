import type { Role } from '@sryg/types'

export interface Actor {
  id: string
  role: Role
}

/**
 * Extension point deciding who may create or update personnel. Throws ForbiddenError to deny.
 *
 * TODO(sryg-auth-rbac, AUTH-04): the current implementation allows every authenticated user,
 * including role `consulta`. Replace it with the RBAC matrix once that change lands.
 */
export interface PersonnelWritePolicy {
  assertCanWrite(actor: Actor): void | Promise<void>
}
