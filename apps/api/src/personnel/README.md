# Personnel module

Create, list, get and update `personal_aeronautico` records (no delete yet: W1-4). Every successful
create/update writes its `auditoria` row in the same transaction (BR-11, NFR-09) through the `UnitOfWork`;
a duplicate cedula returns 409 and leaves no entity and no audit row.

Fields follow D21: first and last names, document type and nationality (catalog ids), birth date, address,
contact data, blood type, cargo, dependencia, category and status. The photo and the signature (D5) live in
`bytea` columns that are never loaded with the record: responses only say `hasPhoto` / `hasSignature`, and
their endpoints belong to W1-4.

## Access

Enforced by the global `PermissionGuard` through `@RequirePermission('personnel', ...)` (AUTH-04, D1, D24):
every role reads; the Admin and Supervisors of any area write; Consulta gets 403 on writes.
