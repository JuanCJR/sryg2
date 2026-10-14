import type { PersonnelWritePolicy } from '../domain/write-policy'

/**
 * Placeholder policy: every authenticated user may write personnel, whatever their role.
 * TODO(sryg-auth-rbac, AUTH-04): replace with the role matrix. See ../README.md.
 */
export class AllowAllWritePolicy implements PersonnelWritePolicy {
  assertCanWrite(): void {}
}
