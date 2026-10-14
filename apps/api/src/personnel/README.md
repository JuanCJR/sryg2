# Personnel module

Create, list, get and update `personal_aeronautico` records (no delete in this change). Every successful
create/update writes its `auditoria` row in the same transaction (BR-11, NFR-09) through the `UnitOfWork`;
a duplicate cedula returns 409 and leaves no entity and no audit row.

## Known gap: write access is not role-restricted

Deliberate, user-approved decision (see the `sryg-monorepo-setup` change): personnel writes
(`POST /api/personnel`, `PATCH /api/personnel/:id`) are allowed for **any authenticated user**, including
role `consulta`. There is no `@Roles()` guard here; the global `JwtAuthGuard` is the only access control.

This is provisional until the `sryg-auth-rbac` change (requirement AUTH-04, role matrix) lands.

### Extension point

`PersonnelWritePolicy` (`domain/write-policy.ts`) is called by the create and update use cases before
anything is written. The default provider, `AllowAllWritePolicy`, is a no-op bound to the
`PERSONNEL_WRITE_POLICY` token in `personnel.module.ts`. To enforce RBAC, provide a policy that throws
`ForbiddenError` (mapped to 403) for roles that may not write and rebind the token; use cases, controller
and audit logic do not change.
