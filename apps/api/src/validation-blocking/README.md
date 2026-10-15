# Validation blocking module

Register and resolve blocks on a person (W1-3, VAL-03..05, BR-07, BR-08, D2, D17). `ActiveBlocksRepository` lives in
`common/credentials`: the credential modules (W1-5, W1-6, W2-2) use it to refuse issuance with 409 while a block is
active (VAL-02).

## Endpoints

| Method | Path                      | Permission         | Notes                                                                    |
| ------ | ------------------------- | ------------------ | ------------------------------------------------------------------------ |
| GET    | `/api/blocks`             | `blocking` `read`  | Filters: `status`, `type` (multi-value: `a,b` or repeated), `personalId`, `q` (name or cédula), paginated |
| GET    | `/api/blocks/:id`         | `blocking` `read`  |                                                                          |
| POST   | `/api/blocks`             | `blocking` `write` | `{ personalId, type, reason }`; always registered `activo`               |
| POST   | `/api/blocks/:id/resolve` | `blocking` `write` | `{ resolutionNote }` (mandatory); 409 when the block is already resolved |

Every role reads; the Admin and the Supervisors of any area write (D2, D24); Consulta gets 403 on writes. Each write
records its `auditoria` row in the same transaction (BR-11): `bloquear` on registration and `resolver` on resolution,
with entity `bloqueo`. A person may hold several active blocks at once (one per impediment); a block is never deleted.

## Files

- `controllers/`: HTTP routes and request validation.
- `services/`: business logic: one service per action (`*.service.ts`) plus the rules and helpers they share.
- `repositories/`: Drizzle queries, built on the pool or on a transaction handle.
- `validation-blocking.types.ts`: the repositories a transaction hands to the services (`TransactionRunner`, BR-11).
- `validation-blocking.module.ts`: wires the controllers, services and repositories together.
