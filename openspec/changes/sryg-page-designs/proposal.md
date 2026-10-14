# Proposal: SRYG page designs (15 pages over 6 templates, mock data)

## Intent

**Design every page in the SRYG page inventory as a working screen with mock data, so the backend can be connected later by swapping one data module per feature.**

Today only 2 of the 15 pages exist (Expediente and Error). Eight routes show a generic `PendingScreen`, and five pages have no route at all. Only `ErrorTemplate` exists as a reusable template; the Expediente implements the detail pattern inline. Without real templates, every new page would invent its own structure and the system would fragment, which is the failure `docs/pages-inventory.md` warns against.

Success means: six real template components, one user-chosen structure per new template, all inventory pages routed and designed with deterministic mock data, and a visible per-page progress checklist in `/home/jc/projects/sryg/docs/pages-inventory.md`.

## Scope

### In Scope

- **Templates as real components** in `src/app/templates/`: `DetailPageTemplate`, `ListPageTemplate`, `FormPageTemplate`, `DashboardTemplate`, `AuthTemplate`. `ErrorTemplate` already exists and is aligned to the `AuthTemplate` structure.
- **Expediente migration** (`src/features/personnel/`) onto the extracted `DetailPageTemplate`, with no visual or behavioral regression.
- **One user choice per new template** (List, Form, Dashboard, Auth) through Impeccable's structure-proposal flow. Sibling pages inherit the chosen structure.
- **All inventory pages** built with mock data, role gating, and the states the runbook §6 requires (empty, error, blocked, no permission):

  | # | Page | Template | Role in plan |
  |---|---|---|---|
  | 4 | Expediente | Detail | Reference (migration) |
  | 3 | Listado de personal | List | Reference |
  | 6 | Emisión / renovación de licencia | Form | Reference |
  | 2 | Dashboard / Alertas | Dashboard | Reference |
  | 1 | Login | Auth | Reference |
  | 14, 11, 15 | Perfil, Usuarios y roles, Error/403/404 | Form, List, Error | Wave 1 |
  | 5 | Registro / edición de personal | Form | Wave 2 |
  | 7 | Certificado médico | Form | Wave 3 |
  | 8, 12 | Bloqueos, Parámetros | List, Form | Wave 4 |
  | 9, 10, 13 | Reportes, Auditoría, Respaldos | List, List, Dashboard | Wave 5 (13 conditional) |

- **"What is not a page" stays inside host pages**: license and medical-certificate history, per-person audit log, and the credential print/export action live in the Expediente (4); alert acknowledgement lives in the Dashboard (2). None gets its own route.
- **Routing**: each page replaces its `PendingScreen` route in `src/app/App.tsx` or adds a new one (pages 1, 5, 6, 7, 8). Login renders outside `AppShell`.
- **Mock data** per feature in `src/features/<feature>/data/demoData.ts`, following the `personnel` precedent.
- **Progress tracking**: one checkbox per page in `/home/jc/projects/sryg/docs/pages-inventory.md`, plus a versioned baseline copy of that file inside this change folder.

### Out of Scope

- Backend, API clients, HTTP or query layers, and real persistence.
- Real authentication, sessions, and password recovery logic (Login is a mock that enters the shell).
- Test infrastructure (no runner is configured; checks are `npm run lint` and `npm run build`).
- Resolving `PRODUCT.md` open decisions (OD-04/05/06/07/08/10/12/14). Pages use the current demo stand-ins.
- Page 16 (credential preview) unless its open question resolves to "build it".
- Relocating `docs/pages-inventory.md` into a git repository.

## Capabilities

No specs exist yet in `openspec/specs/`, so every capability below is new.

### New Capabilities

- `page-templates`: the six template components, their slot contracts, the per-template direction-choice gate, and the rule that sibling pages compose a template instead of inventing structure.
- `app-routing`: route table for all inventory pages, Login outside `AppShell`, permission gating via `RequirePermission`, and retirement of `PendingScreen` routes.
- `demo-data`: the per-feature mock-data convention (deterministic seeds, `DEMO_*_ID` constants, domain types separate from data, container as the only consumer) that makes the backend swap a one-module change.
- `auth-pages`: Login (1) and Perfil / cambio de contraseña (14).
- `personnel-pages`: Listado (3), Expediente on `DetailPageTemplate` (4), Registro / edición (5).
- `alerts-dashboard`: role-dependent Dashboard (2) with alert acknowledgement.
- `credential-forms`: license issuance/renewal (6) and medical certificate (7), with "blocked" as a first-level form state.
- `blocking-management`: block registration and resolution list (8).
- `reports-audit`: Reportes (9) and Visor de auditoría (10).
- `administration-pages`: Usuarios y roles (11), Parámetros (12), Respaldos (13, conditional).

### Modified Capabilities

None.

## Approach

**Templates first, then one reference page per template, then the remaining pages by roadmap wave**, exactly as the inventory's generation order prescribes.

### 1. Direction choice per new template (human gate)

Impeccable treats a page differently depending on whether its template exists (`docs/impeccable-design-workflow.md` §2):

| Case | What Impeccable does | Applies to |
|---|---|---|
| New template | Proposes three distinct structures on a decision page. The user picks one, or steers / re-rolls (`plain`, `safer`, `bolder`, canon) if none fits. | List, Form, Dashboard, Auth |
| Existing template | Treats the page as an extension: inherits composition and components, resolves only content, hierarchy, and states. No structures proposed. | All sibling pages |

For each new template, the flow is:

1. Run `impeccable context --target <reference page path>` and answer its 2–3 questions (task, data, states, frequency, constraints), naming the template and the runbook §6 view.
2. Impeccable presents three structures. **The user chooses. The executor does not pick, default, or infer.** The slice pauses until the choice arrives.
3. Impeccable records the chosen direction in `.impeccable/surfaces/<target>.md`, as it did for the Expediente.
4. Build the template component, then the reference page on it.
5. Run `impeccable harden` and `impeccable audit` on the page, fix findings in one batch, confirm once.

`DetailPageTemplate` has no choice gate: its direction is already committed by the merged Expediente and its surface brief. `ErrorTemplate` has no separate gate: it inherits the `AuthTemplate` structure once Auth is chosen.

**Compose, do not restyle.** Pages assemble templates, organisms, and existing tokens. A missing component is created at its atomic level in `src/design-system/`, not as inline styles in a page.

### 2. Expediente migration with regression safeguards

The extraction and the migration land as separate commits so the migration can be reverted alone.

1. **Fresh baseline.** Before touching code, re-capture the Expediente from `main` at the same viewports and states as `.impeccable/review/` (desktop 1440, tablet, mobile 390; day and night; the `states/` set: tabs, blocked banner, resolve dialog, loading, error, Consulta role, drawer). Confirm the committed screenshots still match `main`; use the fresh capture as the reference if they differ.
2. **Extract** `DetailPageTemplate` from `ExpedienteContainer`: header slot, persistent banner slot (blocked state visible on every tab), tab set, panel area, action area, tablet layout.
3. **Migrate** `ExpedienteContainer` to compose the template. Panels, copy, ARIA roles, focus order, and URL behavior stay unchanged.
4. **Compare** post-migration captures against the baseline, screen by screen. Any difference is a defect unless it is explained and accepted by the user.
5. `npm run lint` and `npm run build` pass.

### 3. Mock data

Each feature gets `domain/types.ts`, `data/demoData.ts`, `containers/`, `components/`, `pages/`, mirroring `src/features/personnel/`. Data is deterministic (no `Math.random`, no dates relative to "now" without a fixed seed), and only containers import it. Connecting the backend later replaces `demoData.ts` behind the container without touching components.

### 4. Progress tracking in `docs/pages-inventory.md`

- Add a "Progreso" section with one GitHub task-list item per page (`- [ ] 1. Login`), in Spanish to match the document. A task list renders real checkboxes; a `[ ]` inside a table cell renders as literal text.
- A page is checked only when its slice is committed with its route, mock data, required states, and passing lint and build.
- **Known limitation:** `/home/jc/projects/sryg` is not a git repository, so edits to this file have no history. Mitigations: `openspec/changes/sryg-page-designs/tasks.md` (in git) is the source of truth for progress, and a baseline copy is stored at `openspec/changes/sryg-page-designs/pages-inventory.baseline.md` before the first edit. The file is not relocated.

### 5. Slice plan (auto-chain, 400-line budget)

Estimates only; `sdd-tasks` finalizes the split. Total about 6,100 authored lines over 15 slices.

| Slice | Content | Choice gate | Est. lines |
|---|---|---|---|
| S01 | `DetailPageTemplate` extraction + Expediente migration (2 commits) | No | ~400 |
| S02 | `ListPageTemplate` | **Yes** | ~350 |
| S03 | Page 3 Listado de personal + list demo data | No | ~450 |
| S04 | `FormPageTemplate` | **Yes** | ~300 |
| S05 | Page 6 Emisión de licencia (+ `licenses` feature) | No | ~500 |
| S06 | `DashboardTemplate` + Page 2 Dashboard (+ `alerts`) | **Yes** | ~550 |
| S07 | `AuthTemplate` + Page 1 Login (route outside shell) | **Yes** | ~400 |
| S08 | Wave 1: Page 15 `ErrorTemplate` alignment + Page 14 Perfil | No | ~350 |
| S09 | Wave 1: Page 11 Usuarios y roles | No | ~400 |
| S10 | Wave 2: Page 5 Registro / edición de personal | No | ~450 |
| S11 | Wave 3: Page 7 Certificado médico | No | ~350 |
| S12 | Wave 4: Page 8 Bloqueos | No | ~450 |
| S13 | Wave 4: Page 12 Parámetros | No | ~350 |
| S14 | Wave 5: Pages 9 Reportes + 10 Auditoría | No | ~550 |
| S15 | Wave 5: Page 13 Respaldos (only if confirmed) | No | ~250 |

Slices above 400 lines are candidates for `sdd-tasks` to split further.

## Open Questions

These are not decided here. Each is resolved by the user at the slice that needs it; independent slices proceed meanwhile.

| # | Question | Blocks | Needed by |
|---|---|---|---|
| Q1 | Does page 13 (Respaldos) exist, or does OPS-04 resolve it with an operations runbook? If dropped, what happens to the `/respaldos` route and nav item? | S15 | S15 |
| Q2 | Is there a page 16 (credential on-screen preview, OUT-03 / OD-09), or is the credential generated directly as PDF? | Possible extra slice | Before S15 |
| Q3 | Login "forgot password" link: drop it, or add a recovery page and its AUTH task? | S07 | S07 |
| Q4 | Parámetros (12): one page grouped by category (runbook proposal) or per-module settings? | S13 | S13 |
| Q5 | Once the Dashboard exists, should `/` redirect to `/panel` instead of the demo Expediente? | Route default | S06 |
| Q6 | `PRODUCT.md` ODs (OD-04/05/06/07/08/10/12/14) stay open. Pages use stand-ins: the `permissions.ts` matrix for OD-14, the DS-05 blocked-state token for OD-07, a threshold parameter for OD-05. Confirm stand-ins are acceptable for design-only delivery. | Copy and gating rework later | Informational |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/app/templates/` | New | `DetailPageTemplate`, `ListPageTemplate`, `FormPageTemplate`, `DashboardTemplate`, `AuthTemplate` (+ CSS modules) |
| `src/app/templates/ErrorTemplate.tsx` | Modified | Aligned to the `AuthTemplate` structure; props and usages preserved |
| `src/app/templates/PendingScreen.tsx` | Removed (eventually) | Deleted when no route uses it; kept while page 13 is unresolved |
| `src/app/App.tsx` | Modified | Page routes replace `PendingScreen`; new routes for 1, 5, 6, 7, 8; Login outside `AppShell` |
| `src/app/shell/nav-items.ts` | Modified | Entry for Bloqueos and any new top-level page; decided in design |
| `src/features/personnel/` | Modified | `ExpedienteContainer` composes `DetailPageTemplate`; new Listado and Registro pages |
| `src/features/{auth,alerts,licenses,medical-certificates,validation-blocking,reports,audit,users,settings}/` | New | Feature folders with domain, demo data, containers, components, pages |
| `src/design-system/` | Possibly modified | Only when a chosen template needs a missing atom, molecule, or organism |
| `.impeccable/surfaces/` | New | One surface brief per new template reference page |
| `.impeccable/review/` | Modified | Refreshed Expediente baseline and post-migration captures |
| `/home/jc/projects/sryg/docs/pages-inventory.md` | Modified (outside git) | "Progreso" checklist, one item per page |
| `openspec/changes/sryg-page-designs/pages-inventory.baseline.md` | New | Versioned pre-change copy of the inventory |

**`DESIGN.md` tokens:** no token changes are planned. Pages inherit the committed visual system. If a chosen template direction requires a new token or component, the slice adds it at the correct layer, updates `DESIGN.md` in the same commit, and calls it out in the PR.

**`PRODUCT.md` personas:** no changes. Roles (Administrador, Supervisor, Consulta) and their access follow the existing demo matrix in `src/app/role/permissions.ts`.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Expediente migration regresses merged, reviewed work | Med | Fresh baseline from `main`; screen-by-screen comparison across viewports, themes, and states; migration in its own commit; lint and build |
| Committed `.impeccable/review/` screenshots are stale | Med | Verify against `main` before use; re-capture if they differ |
| Choice gates stall the chain (four user decisions, each blocking its siblings) | Med | Gates are the first step of their slice; independent slices (e.g., waves on already-chosen templates) proceed while a gate waits |
| The Impeccable decision page needs an interactive session and a running dev server; a sub-agent cannot relay it | Med | The orchestrator runs each gate in the interactive session and passes the recorded choice to the apply slice |
| `docs/pages-inventory.md` has no version history | High (certain) | `tasks.md` is the source of truth; baseline copy in the change folder; checklist is a projection that can be regenerated |
| Pages built before ODs resolve need copy or permission rework | Med | Stand-ins isolated in one place each (DS-05 token, `permissions.ts`, threshold parameter) |
| Pages 13 and 16 may never exist | Med | S15 is conditional and last; page 16 is out of scope until Q2 resolves |
| A template abstraction fits its reference page but not its siblings | Med | Reference pages are the most demanding per the inventory; template props are extended, not bypassed, when a sibling needs more |
| Total size (~6,100 lines) strains review | Med | Auto-chain slices near the 400-line budget, each independently revertible |

## Rollback Plan

- **Per slice:** every slice is a self-contained commit set in the auto-chain. Revert the slice's PR (or its commits) to restore the previous state. Slices only add routes and features, so reverting one does not break earlier slices.
- **Dependency order:** a template slice must be reverted together with the pages built on it (S02 with S03/S09/S12/S14; S04 with S05/S08/S10/S11/S13; S06 with S15; S07 with S08's Error alignment). Page slices can be reverted alone.
- **Expediente migration:** revert the migration commit only. `ExpedienteContainer` returns to its bespoke layout; the extracted template stays unused and harmless.
- **Routes:** reverting a page slice restores its `PendingScreen` route. `PendingScreen` is deleted only in the final slice that removes its last usage, so it is available throughout the chain.
- **Inventory file (no git):** restore from `openspec/changes/sryg-page-designs/pages-inventory.baseline.md`, or uncheck items to match `tasks.md`.
- **Surface briefs and `DESIGN.md`:** tracked in git; revert with their slice.

## Dependencies

- User availability for four direction choices (List, Form, Dashboard, Auth) and for Q1–Q5 at their slices.
- Impeccable launcher (`impeccable context`, `harden`, `audit`) and a runnable dev server (`npm run dev`) for decision pages and screenshots.
- Page content definitions in `/home/jc/projects/sryg/docs/design-brief-runbook.md` §6 and roles in `sryg-definitions-and-tasks.md` §4.
- Existing shell, role gating, design system, and `ErrorTemplate` from the merged `sryg-design-system` feature.

## Success Criteria

- [ ] `src/app/templates/` contains `DetailPageTemplate`, `ListPageTemplate`, `FormPageTemplate`, `DashboardTemplate`, and `AuthTemplate`; `ErrorTemplate` follows the Auth structure.
- [ ] Each new template (List, Form, Dashboard, Auth) has a user-chosen direction recorded in `.impeccable/surfaces/`.
- [ ] The Expediente renders through `DetailPageTemplate` and matches the pre-migration baseline in every captured viewport, theme, and state.
- [ ] Every inventory page (14 or 15, depending on Q1) has a route and a designed screen; no inventory route renders `PendingScreen`.
- [ ] Every page reads only from its feature's deterministic `data/demoData.ts` through a container; no network calls.
- [ ] Every page covers its runbook §6 states (empty, error, blocked, no permission) and respects the role matrix in `permissions.ts`.
- [ ] "What is not a page" items exist inside their host pages, not as routes.
- [ ] `impeccable harden` and `impeccable audit` ran on every page with no open P0 finding.
- [ ] `npm run lint` and `npm run build` pass on every slice.
- [ ] `docs/pages-inventory.md` has one checkbox per page, matching `tasks.md`, and the baseline copy exists in the change folder.
