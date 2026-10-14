# Licenses module

Issue and renew licenses with their type and class ratings and observations, plus the license query (W1-5,
LIC-01..08, D13, D20, D22).

## Endpoints

| Method and path | Permission | What it does |
|---|---|---|
| `GET /api/licenses` | licenses read | Query as in SLYM: `q` (applicant: names or document number), `number`, `licenseTypeId`, `expiryFrom`/`expiryTo` (inclusive), `personalId`, paginated. Sorted by expiry (no expiry last). |
| `GET /api/licenses/check` | licenses read | Pre-check of a trámite (LIC-05): active block, D13 coherence and the projected expiry with its `PENDIENTE INAC` flag. |
| `GET /api/licenses/:id` | licenses read | One license with its observations and ratings. |
| `GET /api/licenses/:id/history` | audit read | History (LIC-06): the audit rows of the license and of its ratings, newest first. |
| `GET /api/personnel/:id/licenses` | licenses read | The person's licenses with their ratings (Expediente). |
| `POST /api/licenses` | licenses write | Issue, with the ratings of the same trámite. |
| `POST /api/licenses/:id/renew` | licenses write | Renew in place, with the rating changes (add, renew, remove) of the same trámite. |
| `POST /api/licenses/:id/{type,class}-ratings` | licenses write | Add a rating. |
| `POST /api/licenses/:id/{type,class}-ratings/:ratingId/renew` | licenses write | Renew a rating (new expiry). |
| `DELETE /api/licenses/:id/{type,class}-ratings/:ratingId` | licenses write | Remove a rating. |

Writes are allowed to the Admin and to the Supervisor de Licencias (D1, D24); Consulta and the Supervisor de
Medicina get 403.

## Rules

- **Expiry (D3, D20).** Never sent by the client: `issue_date + validity_months` of the license type, in
  calendar months (a missing day falls on the month's last day). Null when the type has
  `applies_expiry = false`. A type that expires but has no months configured answers 409.
- **Number (D22).** Defaults to the holder's document number on issue; a renewal keeps the current one unless
  a new one is sent.
- **Block (BR-07).** Issuing or renewing a license, and issuing or renewing a rating, answer 409 while the
  person has an active block. Removing a rating is not an issuance and is allowed.
- **Coherence (D13).** A license type that requires a RAV 67 class needs a medical certificate of exactly that
  class whose expiry is today or later; otherwise 409 with the reason. Issuing or renewing a rating needs the
  license valid today.
- **Catalogs (D19).** New references must be active catalog items (404 otherwise). Observations already on a
  license may stay on renewal after being deactivated.
- **Transaction and audit (BR-11, NFR-09).** Each trámite runs in one transaction with its audit rows:
  `emitir` / `renovar` on `licencia`, and `emitir` / `renovar` / `eliminar` on `habilitacion_tipo` and
  `habilitacion_clase` (their snapshots carry `licenseId`, which the history uses). The license row is locked
  for the trámite.
- **Status (D17, BR-12).** Derived on read with `deriveCredentialStatus`, the configurable threshold and the
  active blocks; a rating shares its holder's block. "Today" is the UTC calendar day.

A renewal updates the license row in place: its previous dates live in the `renovar` audit snapshot, which
is what the history shows.
