# Credentials module

CR80 license and medical certificate PDFs with QR (W2-2, OUT-01..05, D7, D18, D22).

- `GET /api/personnel/:id/credentials/license/:licenseId.pdf` and `GET /api/personnel/:id/credentials/medical/:certId.pdf`: front and back on two CR80 pages, laid out as §4 of `docs/plan-ejecucion-paralela.md`. Admin and Supervisors (`credentials:export`), a Supervisor only for the card of their area (`licenses:write` / `medical_certificates:write`, D24).
- 409 while the person has an active block (BR-07, D9) or once the credential is `vencida`; a credential `proxima_a_vencer` or without expiry (D20) still prints.
- Each print writes an `emitir` audit row on the credential (`licencia` / `certificado_medico`, `changes.after.salida = 'credencial_pdf'`) in the same transaction as the reads (BR-11).
- The INAC logo and the President's signature come from `recurso_grafico` (D18); the photo and holder signature from the person (D5). Any missing or unreadable image prints a placeholder. The coat of arms and the ICAO watermark are not stored resources: they are drawn as outlines.
- The QR encodes `<web origin>/verificar/<verification_token>`; the web origin is the first `CORS_ORIGIN`.
