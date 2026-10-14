# Exploration: SRYG page designs (15 pages / 6 templates, design-only, Impeccable-driven)

## Intent

Take the page inventory (`/home/jc/projects/sryg/docs/pages-inventory.md`) and use Impeccable to design every page, so the backend can be connected later. Scope is design only: pages with mock data, no backend. The user chooses which page style to keep from what Impeccable proposes. The inventory gets a progress checkbox per page.

## Current State

`sryg-frontend` has one closed ODD feature, `sryg-design-system` (merged to `main`), which built tokens, atoms, molecules, organisms, a role-gated `AppShell`, `ErrorTemplate`, and one full feature — the Expediente (page 4) — as proof. `src/app/App.tsx` routes 8 target pages to a generic `PendingScreen` placeholder naming the future change slug; 5 pages have no route; 2 are real.

Only `ErrorTemplate.tsx` exists as a reusable template component. `PendingScreen` is a "not built yet" stub, not one of the 6 templates. `DetailPageTemplate` was never extracted: the Expediente is a bespoke `ExpedienteContainer` plus hand-built panels that follow the direction contract without importing a shared template. `ListPageTemplate`, `FormPageTemplate`, `DashboardTemplate`, and `AuthTemplate` do not exist.

## Existing-vs-Missing Matrix

### Templates

| Template | State | Evidence |
|---|---|---|
| ErrorTemplate | Built | `src/app/templates/ErrorTemplate.tsx`, used for 404 and `RequirePermission` 403 |
| DetailPageTemplate | Embedded, not extracted | Expediente (`src/features/personnel/`) implements the pattern inline |
| ListPageTemplate | Missing | — |
| FormPageTemplate | Missing | — |
| DashboardTemplate | Missing | — |
| AuthTemplate | Missing | — |

### Pages

| # | Page | Template | State |
|---|---|---|---|
| 1 | Login | AuthTemplate | Missing — no route |
| 2 | Dashboard / Alertas | DashboardTemplate | Placeholder (`/panel`) |
| 3 | Listado de personal | ListPageTemplate | Placeholder (`/personal`) |
| 4 | Expediente | DetailPageTemplate | Built (mock data) |
| 5 | Registro / edición de personal | FormPageTemplate | Missing — no route |
| 6 | Emisión / renovación de licencia | FormPageTemplate | Missing — no route |
| 7 | Certificado médico | FormPageTemplate | Missing — no route |
| 8 | Bloqueos | ListPageTemplate | Missing — no route (resolve dialog exists only inside Expediente) |
| 9 | Reportes | ListPageTemplate | Placeholder (`/reportes`) |
| 10 | Auditoría | ListPageTemplate | Placeholder (`/auditoria`, gated `audit:view`) |
| 11 | Usuarios y roles | ListPageTemplate | Placeholder (`/usuarios`, gated `users:admin`) |
| 12 | Parámetros | FormPageTemplate | Placeholder (`/parametros`, gated `settings:admin`) |
| 13 | Respaldos | DashboardTemplate | Placeholder (`/respaldos`) — existence uncertain (inventory footnote 3) |
| 14 | Perfil | FormPageTemplate | Placeholder (`/perfil`) |
| 15 | Error / 403 / 404 | ErrorTemplate | Built |

Built: 2/15. Placeholder only: 8/15. No route: 5/15.

## Affected Areas

- `docs/pages-inventory.md` — gets a progress checkbox column. It lives outside any git repository (`/home/jc/projects/sryg` is not a repo), so its edits have no history.
- `src/app/templates/` — the missing template components.
- `src/app/App.tsx` — each new page replaces its `PendingScreen` route or adds one (pages 1, 5, 6, 7, 8).
- `src/features/<feature>/` — one folder per feature following the `personnel` precedent: `domain/types.ts`, `domain/status.ts`, `data/demoData.ts`, `containers/`, `components/`, `pages/`.
- `.impeccable/surfaces/` — one surface brief (direction contract) per new reference page, as already done for the Expediente.
- `PRODUCT.md` open decisions (OD-05, 07, 08, 09, 10, 12, 14) stay unresolved and touch most pending pages; `permissions.ts` already hardcodes the proposed OD-14 matrix as a demo stand-in.

## Approaches

1. **Template-first, as the inventory prescribes.** Build the missing templates as real reusable components, run Impeccable's "new template → three structures → pick one" flow per template, build the reference page, then the remaining pages by roadmap wave.
   - Pros: matches the documented plan; each reference page fixes a direction its siblings inherit.
   - Cons: many chained slices; if `DetailPageTemplate` is also extracted, the merged Expediente needs a retrofit.
   - Effort: High.
2. **Templates as documented convention.** Build each reference page directly; siblings copy its structure by convention, not by import.
   - Pros: matches the Expediente precedent; faster to the first page.
   - Cons: no compiler-enforced consistency; contradicts the inventory's "templates first" rule.
   - Effort: Medium.
3. **Parallel worktrees per template.**
   - Pros: faster wall-clock.
   - Cons: violates the inventory's warning about fragmentation; direction choices still queue on one person.
   - Effort: High, higher coordination risk.

## Recommendation

Approach 1. Decide first whether the Expediente is retrofitted onto an extracted `DetailPageTemplate` or left as-is, because that changes the scope of the first slice.

## Open Product Decisions

1. Template extraction: retrofit Expediente onto a formal `DetailPageTemplate`, or extract components only for the new templates.
2. Progress tracking: `docs/pages-inventory.md` is outside git (the user asked for the checkbox in that file).
3. Scope of uncertain pages: page 13 (Respaldos) and a possible credential-preview page 16 (OUT-03).
4. Login: drop the "forgot password" link or add a recovery page.
5. Parámetros (12): one page grouped by category or per-module settings.
6. Generation order: wave by wave, or all templates first.

## Mock-Data Strategy

Reuse the Expediente pattern (`src/features/personnel/data/demoData.ts`): a colocated `data/demoData.ts` per feature, deterministic seeded generation (no `Math.random`), a `DEMO_*_ID` constant the router defaults to, and domain types kept separate from data. Swapping in the backend later replaces the data module behind the container.

## Size Forecast

`sryg-design-system` cost about 3,500 authored lines in 4 slices. Remaining scope: 4 new templates, 4 more reference pages, and about 9 sibling pages with mock data, gating, and states. Estimate 300–600 lines per page or template, about 4,000–7,000 lines total, roughly 10–15 chained slices at the 400-line budget. The cached `auto-chain` strategy fits.

## Risks

- Retrofitting the Expediente could regress merged, reviewed work.
- `docs/pages-inventory.md` has no version history.
- Pages built before OD-05/06/07/08/12/14 resolve may need copy or permission rework; DS-05 isolates the blocked-state name in one token.
- Pages 13 and 16 may never exist.
- The total surface needs careful slice sequencing.

## Ready for Proposal

Yes, after the user answers the open decisions that shape scope (1 and 3 most directly).
