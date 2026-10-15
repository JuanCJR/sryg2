# Reports module

The three v1 reports with Excel (.xlsx) and PDF export (W1-8, REP-01..03, REP-06, D10).

- `GET /api/reports/:report` — `vencimientos` (expired and near-expiry credentials), `estado_consolidado` (current credentials and worst status per person) or `bloqueos_activos`. Filters: `q` (name or document), `licenseTypeId`, `rav60Category`, `status`, `from`/`to` (expiry date; registration date for blocks), `page`, `pageSize`. `licenseTypeId`, `rav60Category` and `status` take several values (`?status=a,b` or repeated params).
- `GET /api/reports/:report/export?format=xlsx|pdf` — every matching row; audited as `exportar` on entity `reporte`.
- Statuses come from `deriveCredentialStatus` with the threshold of `ValidityParametersReader` and the blocks of `ActiveBlockQuery`. Only current credentials count: the latest license per person and type, the latest rating per license and rating, the latest medical certificate per person.
- Consulta reads only `vencimientos` and exports nothing (`canAccessReport` in `@sryg/types`).
