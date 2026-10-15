# Public verify module

Unauthenticated, throttled QR check that returns only the D9 fields (W2-2, OUT-04, D9).

`GET /api/public/verify/:token` answers `{ kind, number, status, expiryDate }` (`publicVerificationSchema`). The status is `deriveCredentialStatus` with `proxima_a_vencer` shown as `vigente`; an active block shows `bloqueada`. Unknown or malformed tokens answer 404. It uses the login throttler (`LOGIN_THROTTLE_LIMIT` per `LOGIN_THROTTLE_TTL`, per IP).

## Files

- `controllers/`: HTTP routes and request validation.
- `services/`: business logic: one service per action (`*.service.ts`) plus the rules and helpers they share.
- `repositories/`: Drizzle queries, built on the pool or on a transaction handle.
- `dtos/`: data shapes passed between controllers, services and repositories.
- `public-verify.module.ts`: wires the controllers, services and repositories together.
