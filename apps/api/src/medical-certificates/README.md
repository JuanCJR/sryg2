# Medical certificates module

Register and renew RAV 67 medical certificates with observations and restrictions, never clinical data (W1-6, MED-01..07, BR-05, D8).

## Endpoints

| Method | Path                                              | Permission                   | What                                                                                                         |
| ------ | ------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/personnel/:personalId/medical-certificates` | `medical_certificates:read`  | The holder's certificates (newest issue first) with derived status, `hasActiveBlock` and the alert threshold |
| POST   | `/api/personnel/:personalId/medical-certificates` | `medical_certificates:write` | Register: class, optional number, issue date, catalog observations, restrictions                             |
| GET    | `/api/medical-certificates/validity`              | `medical_certificates:read`  | Validity in months of each class, with its `PENDIENTE INAC` flag (D3)                                        |
| GET    | `/api/medical-certificates/:id`                   | `medical_certificates:read`  | One certificate                                                                                              |
| POST   | `/api/medical-certificates/:id/renew`             | `medical_certificates:write` | Renew (same class): new issue date; omitted fields keep their value                                          |
| GET    | `/api/medical-certificates/:id/history`           | `audit:read`                 | Audit rows of the certificate, newest first (MED-07)                                                         |

## Rules

- **Writers (D24):** the Admin and Supervisors of the Medicina area (or `ambas`); everybody else gets 403.
- **Number (D22):** defaults to the holder's document number.
- **Expiry (D3):** never sent by the client. It is the issue date plus the class validity read from
  `parametro_sistema` (`medicalExpiryDate` in `@sryg/types`; a day missing in the target month clamps to its last day).
- **Block check (BR-07):** registering or renewing while the holder has an active block answers 409 with a readable
  reason, and writes nothing.
- **Observations (D19):** catalog ids. Unknown ids answer 400; new links must be active items, while an inactive
  item already on the certificate may stay on renewal.
- **No clinical data (BR-05, D8):** inputs are strict objects, so any other field (diagnosis, history, expiry…)
  answers 400. The tables hold only class, number, dates, restrictions and observations.
- **Status:** derived on every read with `deriveCredentialStatus` (an active block shows as `bloqueada`); the stored
  `status` column is not used.
- **Audit (BR-11):** registration writes `emitir`, renewal `renovar` (with before/after), in the same transaction.

## Files

- `controllers/`: HTTP routes and request validation, plus the exception filters or middleware only this module uses.
- `services/`: business logic: one service per action (`*.service.ts`) plus the rules and helpers they share.
- `repositories/`: Drizzle queries, built on the pool or on a transaction handle.
- `dtos/`: data shapes passed between controllers, services and repositories.
- `medical-certificates.types.ts`: the repositories a transaction hands to the services (`TransactionRunner`, BR-11).
- `medical-certificates.module.ts`: wires the controllers, services and repositories together.
