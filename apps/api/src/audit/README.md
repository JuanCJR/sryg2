# Audit module

Append-only audit trail (BR-11, NFR-04): `AuditLogRepository`, written inside the transaction of each mutation, and the audit viewer with Excel export (W1-7, REP-04, REP-05).

- `GET /api/audit`: filters `actor` (name or email), `action`, `entity`, `entityId`, `personId` (the person's record and the entities that hang from it), `from`/`to` (inclusive UTC days), plus `page`/`pageSize`. Newest first. `action` and `entity` take several values (`?action=a,b` or repeated params).
- `GET /api/audit/export.xlsx`: the same filters, every matching entry as an Excel workbook (`common/spreadsheet`).
- Both are read-only and need `audit:read` (Admin and Supervisor, D1).

## Files

- `controllers/`: HTTP routes and request validation.
- `services/`: business logic: one service per action (`*.service.ts`) plus the rules and helpers they share.
- `repositories/`: Drizzle queries, built on the pool or on a transaction handle.
- `dtos/`: data shapes passed between controllers, services and repositories.
- `audit.module.ts`: wires the controllers, services and repositories together.
