# Audit module

Append-only audit trail (BR-11, NFR-04): the `AuditLog` port written in each unit of work, and the audit viewer with CSV export (W1-7, REP-04, REP-05).

- `GET /api/audit`: filters `actor` (name or email), `action`, `entity`, `entityId`, `personId` (the person's record and the entities that hang from it), `from`/`to` (inclusive UTC days), plus `page`/`pageSize`. Newest first. `action` and `entity` take several values (`?action=a,b` or repeated params).
- `GET /api/audit/export.csv`: the same filters, every matching entry as CSV (UTF-8 with BOM, CRLF).
- Both are read-only and need `audit:read` (Admin and Supervisor, D1).
