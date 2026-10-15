# UI conventions — tables, filters, pagination, color

These rules keep every list in SRYG predictable, so staff build muscle memory: the same kind of
data is always in the same place. New tables and list pages must follow them.

## 1. Column order

Every table orders its columns by role, left to right:

| Position | Role | Examples |
| --- | --- | --- |
| 1 | **ID** — the record's identifier | Cédula, Número de licencia, Correo (users), Código |
| 2 | **Persona** — who the row is about | Titular, Solicitante, Nombre, Actor |
| 3 | **Tipo** — what kind of record it is | Tipo de licencia, Credencial, Tipo de bloqueo, Rol, Acción |
| 4… | **Detalle** — the remaining descriptive columns | Motivo, Descripción, Categoría RAV 60, Área |
| … | **Fechas** — dates and remaining days, oldest meaning first | Emitida, Vence, Registrado, Días restantes |
| last data column | **Estado** — the status badge/lamp | Vigente, Vencida, Activo, Resuelto |
| trailing | **Acciones** | Ver, Resolver, Editar |

A role a table does not have is simply skipped; the relative order of the others never changes.
When a table shows a person but not their record id, the person's **cédula** is the ID column.

## 2. Filters

- Filters live in a **left column** (`FilterPanel` from the design system), passed to
  `ListPageTemplate` through its `filters` slot. Tablets and phones collapse it behind a
  "Filtros" toggle that shows the active count.
- Closed sets of values (status, type, area, category, action…) are **checkbox groups**
  (`CheckboxFilter`): several values can be checked; none checked means "all". The API accepts
  repeated values as a comma-separated query parameter (`?type=a,b`).
- Free text (name, cédula, number) and date ranges go in `FilterSection`s of the same panel.
  Open catalogs (license types…) use the searchable `Combobox`/`CatalogSelect`.
- The panel offers "Limpiar todo", and each group its own "Limpiar".

## 3. Pagination

- Every list that can grow is paginated with the design-system `Pagination`, passing `total` and
  `pageSize` so it reads "Mostrando 26–50 de 312".
- Server lists page on the API (`page`/`pageSize`). Lists the API returns whole (expediente tabs,
  histories, attachments) page on the client with `useClientPagination` (10 rows by default).
- Changing a filter always returns to page 1.

## 4. Inputs

- Dates use `DateInput`: typed `dd/mm/aaaa` plus a calendar button (Monday-first, month/year
  jump, "Hoy", "Limpiar"); `min`/`max` disable out-of-range days.
- Choices among many options use `Combobox` (search, highlight, keyboard, clear button). Short
  fixed lists in forms may stay a native `Select`.

## 5. Color

The INAC institutional blue (`--inac-blue`, #04528A) replaces the former near-black as the brand
ink: primary buttons, selection, focus, the current page, checked boxes and active navigation
use the `--accent*` / `--inverse-*` tokens. The neutral ramp is navy-tinted. Red and amber remain
reserved for credential status lamps.
