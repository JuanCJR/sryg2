# Catalogs module

The D19 catalogs (license types, type ratings, class ratings, aircraft, functions, license and medical
observations, document types, attachment types and nationalities), addressed by the slugs of `CATALOGS`
in `@sryg/types`.

- `GET /api/catalogs/:catalog/options?q=&limit=`: active items only (id, nameEs, nameEn), for the
  selectors (`CatalogSelect`). Unchanged since wave 0.
- `GET /api/catalogs/:catalog?q=&page=&pageSize=&active=`: every item, active or not, searched on both
  names and sorted by the Spanish one, for the maintenance pages.
- `POST /api/catalogs/:catalog`: creates an item (`nameEs`, optional `nameEn`).
- `PATCH /api/catalogs/:catalog/:id`: edits the texts and activates or deactivates (`active`).
- `DELETE /api/catalogs/:catalog/:id`: deletes an item nobody references. An item in use answers 409: every
  reference is `ON DELETE RESTRICT`, so it is deactivated instead and existing records keep it.

License types also carry `rav60Category`, `requiredMedicalClass` (D13), `appliesExpiry` (D20) and
`validityMonths`. A request that carries `validityMonths` sets `validityIsPlaceholder = false` (D3), even
when the value equals the seed's placeholder: the Admin confirmed it.

A case-insensitive duplicate Spanish name answers 409. Every write records its `auditoria` row (`crear`,
`actualizar` or `eliminar`, entity = table name) in the same transaction (BR-11); an edit that changes
nothing writes nothing.

## Access

`@RequirePermission('catalogs', ...)`: every role reads; only the Admin writes (D19, D1).

## Files

- `controllers/`: HTTP routes and request validation.
- `services/`: business logic: one service per action (`*.service.ts`) plus the rules and helpers they share.
- `repositories/`: Drizzle queries, built on the pool or on a transaction handle.
- `dtos/`: data shapes passed between controllers, services and repositories.
- `catalogs.types.ts`: the repositories a transaction hands to the services (`TransactionRunner`, BR-11).
- `catalogs.module.ts`: wires the controllers, services and repositories together.
