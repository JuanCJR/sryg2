# Personnel module

Create, list, get, update and delete `personal_aeronautico` records, plus the photo, the signature and the
attached documents of the person's file. Every successful write records its `auditoria` row in the same
transaction (BR-11, NFR-09) through the `UnitOfWork`; a duplicate cedula returns 409 and leaves no entity and no
audit row.

Fields follow D21: first and last names, document type and nationality (catalog ids), birth date, address,
contact data, blood type, cargo, dependencia, category and status. A new document type or nationality must name
an active catalog item (400 otherwise); a value the record already holds is kept even if it was deactivated.

## Endpoints

| Method and path                                       | What it does                                                                                                                                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/personnel`, `GET /api/personnel/:id`        | List (search by name or cedula) and read.                                                                                                                                                                            |
| `POST /api/personnel`, `PATCH /api/personnel/:id`     | Create and update (`crear` / `actualizar`).                                                                                                                                                                          |
| `DELETE /api/personnel/:id`                           | 204, or 409 while the person holds a license or a medical certificate (PER-07, BR-10) or a block references them (`eliminar`).                                                                                       |
| `PUT /api/personnel/:id/photo`, `/signature`          | Multipart `file`: JPEG, PNG or WebP up to 5 MB. Compressed by the server with sharp to 200 KB at most, the photo as JPEG and the signature as PNG (D5). Audited as `actualizar` with type and size, never the bytes. |
| `GET /api/personnel/:id/photo`, `/signature`          | The stored image; 404 when there is none.                                                                                                                                                                            |
| `GET /api/personnel/:id/attachments`                  | The documents, newest first, with the catalog type name; never the bytes.                                                                                                                                            |
| `POST /api/personnel/:id/attachments`                 | Multipart `file` + `attachmentTypeId` (active catalog item). PDF, JPEG or PNG up to 5 MB, typed by its bytes, not by the declared type (D21). Audited as `adjuntar`.                                                 |
| `GET /api/personnel/:id/attachments/:attachmentId`    | Download (`Content-Disposition: attachment`).                                                                                                                                                                        |
| `DELETE /api/personnel/:id/attachments/:attachmentId` | 204; audited as `eliminar`.                                                                                                                                                                                          |

Upload errors: 400 when the file or a field is missing, 413 over 5 MB, 415 for other file types.

## Access

Enforced by the global `PermissionGuard` through `@RequirePermission('personnel', ...)` (AUTH-04, D1, D24):
every role reads; the Admin and Supervisors of any area write; Consulta gets 403 on writes.
