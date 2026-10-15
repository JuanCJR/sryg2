# Alerts module

Idempotent expiry alerts, recalculated daily and on request, with acknowledgement (W1-9, ALR-01, ALR-02, ALR-04, ALR-06, D6). In-app only (D6); the dashboard that shows them is W2-1.

## Recalculation

`RecalculateAlertsService` rebuilds the `alerta` table from licenses, type ratings, class ratings and medical certificates:

- `vencida` from the day after the expiry date, `proxima` while the remaining days are within the threshold `alerts.threshold_days` (D3, BR-12). Both come from `deriveCredentialStatus`, ignoring blocks: an alert is about the date.
- Licenses with `expiry_date` null (D20) never raise alerts.
- Idempotent: one alert per `(credential_id, kind)`. A credential that no longer alerts (renewed, or `proxima` that became `vencida`) loses its alert; a changed due date moves the alert and clears its acknowledgement.
- Runs in one transaction behind an advisory lock, so the daily job and concurrent requests do not race.
- "Today" is the UTC calendar day, the same calendar `deriveCredentialStatus` uses for a `Date`.

It runs every day at midnight (server time) with `@nestjs/schedule` (`AlertsDailyJob`) and before answering `GET /api/alerts` and `GET /api/alerts/summary`, because the free hosting sleeps (D6).

## Endpoints

Every role with `alerts:read` (all of them, D1) may call them.

| Method | Path                          | Notes                                                                                                                                                                                                                                 |
| ------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/alerts`                 | Filters `kind`, `acknowledged`, `area` (`licencias` / `medicina`), `credentialKind`, `personalId`; `page`, `pageSize`. `kind`, `area` and `credentialKind` take several values (`?area=a,b` or repeated params). Ordered by due date. |
| GET    | `/api/alerts/summary`         | Same filters. Counts by kind, acknowledgement, credential kind and area.                                                                                                                                                              |
| POST   | `/api/alerts/:id/acknowledge` | Audited as `reconocer` in the same transaction (BR-11). 404 if unknown, 409 if already acknowledged.                                                                                                                                  |

The area of an alert is the area of its credential (`alertAreaOf` in `@sryg/types`): licenses and ratings belong to `licencias`, medical certificates to `medicina`.

## Files

- `controllers/`: HTTP routes and request validation.
- `services/`: business logic: one service per action (`*.service.ts`) plus the rules and helpers they share.
- `repositories/`: Drizzle queries, built on the pool or on a transaction handle.
- `dtos/`: data shapes passed between controllers, services and repositories.
- `alerts.types.ts`: the repositories a transaction hands to the services (`TransactionRunner`, BR-11).
- `alerts.module.ts`: wires the controllers, services and repositories together.
