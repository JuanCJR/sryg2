# Settings module

System parameters and the credential graphic resources of page 12 `/parametros` (W1-2, D3, D15, D18).
Admin only, reads included: `@RequirePermission('settings', ...)`; Supervisor and Consulta get 403.

## Parameters (`parametro_sistema`, D3)

- `GET /api/settings/parameters`: alert threshold (days) and validity per RAV 67 class (months), each with
  `isPlaceholder` (shown as `PENDIENTE INAC`) and `updatedAt`.
- `PUT /api/settings/parameters/alert-threshold` `{ days }` and
  `PUT /api/settings/parameters/medical-validity` `{ clase_1, clase_2, clase_3 }`: positive whole numbers.
  Saving sets `is_placeholder = false`, even when it confirms the placeholder value as is; re-saving an
  unchanged real value writes nothing. Both answer with the full parameters.

License-type validity is edited in its catalog (W1-11), not here.

## Graphic resources (`recurso_grafico`, D18)

- `GET /api/settings/graphic-resources`: `logo_inac` and `firma_presidente`, with `configured`, `mime`,
  `size` and `updatedAt` (no bytes).
- `GET /api/settings/graphic-resources/:kind`: the image bytes; 404 while not configured.
- `PUT /api/settings/graphic-resources/:kind`: the raw image as the body, with `Content-Type: image/png` or
  `image/jpeg`. Up to 500 KB (500 × 1024 bytes): 413 above, 400 when empty, 415 for any other type or when
  the file signature does not match the declared type. `RawImageBodyMiddleware` reads the body for this route
  only.

## Audit (BR-11)

Every write records its `auditoria` row in the same transaction through `SettingsTransaction`:
`actualizar` on `parametro_sistema` with the before/after of each changed key, and `crear` / `actualizar`
on `recurso_grafico` with kind, MIME and size (never the bytes). Both keys are text, so `entity_id` is null.

## Files

- `controllers/`: HTTP routes and request validation, plus the exception filters or middleware only this module uses.
- `services/`: business logic: one service per action (`*.service.ts`) plus the rules and helpers they share.
- `repositories/`: Drizzle queries, built on the pool or on a transaction handle.
- `settings.types.ts`: the repositories a transaction hands to the services (`TransactionRunner`, BR-11).
- `settings.module.ts`: wires the controllers, services and repositories together.
