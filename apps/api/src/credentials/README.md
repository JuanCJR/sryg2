# Credentials module

CR80 license and medical certificate PDFs with QR (W2-2, OUT-01..05, D7, D18, D22).

- `GET /api/personnel/:id/credentials/license/:licenseId.pdf` and `GET /api/personnel/:id/credentials/medical/:certId.pdf`: front and back on two CR80 pages, laid out as §4 of `docs/plan-ejecucion-paralela.md`. Admin and Supervisors (`credentials:export`), a Supervisor only for the card of their area (`licenses:write` / `medical_certificates:write`, D24).
- 409 while the person has an active block (BR-07, D9) or once the credential is `vencida`; a credential `proxima_a_vencer` or without expiry (D20) still prints.
- Each print writes an `emitir` audit row on the credential (`licencia` / `certificado_medico`, `changes.after.salida = 'credencial_pdf'`) in the same transaction as the reads (BR-11).
- Every block sits where the real INAC cards print it (positions and type sizes measured on a photo of real cards, which is not committed because it holds personal data): the ICAO field numbers (I, II, III, IV, IVa, V, VI, VII, VIII, IX, X, XII, XIII), the three side-by-side address / nationality / birth date labels, the stacked red class letters in Spanish and English on the medical front, and the justified legal texts on the medical back.
- The coat of arms of Venezuela, the ICAO emblem (the translucent watermark) and the official INAC logo ship in `apps/api/assets/credentials/`. The INAC logo and the President's signature uploaded in `recurso_grafico` (D18) take precedence; the photo and holder signature come from the person (D5). A missing or unreadable photo or signature prints a placeholder.
- The QR encodes `<web origin>/verificar/<verification_token>`; the web origin is the first `CORS_ORIGIN`.

## Files

- `controllers/`: HTTP routes and request validation.
- `services/`: business logic: one service per action (`*.service.ts`) plus the rules and helpers they share.
- `repositories/`: Drizzle queries, built on the pool or on a transaction handle.
- `dtos/`: data shapes passed between controllers, services and repositories.
- `credentials.types.ts`: the repositories a transaction hands to the services (`TransactionRunner`, BR-11).
- `credentials.module.ts`: wires the controllers, services and repositories together.
