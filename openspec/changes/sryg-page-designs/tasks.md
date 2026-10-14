# Tasks: SRYG page designs (15 pages over 6 templates, mock data)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~6,250 (foundations ~150 + 15 slices ~6,100, per proposal §Slice plan) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Foundations → S01 → S02 → S03 → S04 → S05 → S06 → S07 → S08 → S09 → S10 → S11 → S12 → S13 → S14 → S15 (16 slices) |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Note: `auto-chain` proceeds with the first slice without asking on every slice, but the chain strategy itself (`stacked-to-main` vs `feature-branch-chain`) is not yet cached. Per the orchestrator's instruction, ask the user for it once, immediately after this forecast, before opening PR #2 (Foundations and S01's base is `main`/tracker either way, so they are unaffected by the choice). Cache the answer and do not mix strategies afterward.

### Suggested Work Units

| Unit | Goal | Likely PR | Est. lines | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|-----------|----------------------|-----------------|-------------------|
| Foundations | Demo-data kernel, route registry, ESLint boundaries, inventory Progreso section | PR 1 | ~150 | `npm run lint && npm run build` | `npm run dev` → visit `/personal/demo-017`, confirm no visual change | Revert commit; no route depends on it yet (Expediente still uses its own loader) |
| S01 | `DetailPageTemplate` + `Skeleton` atom, then Expediente migration (3 commits) | PR 2 | ~400 | `npm run lint && npm run build` | `npm run dev` → `/personal/demo-017` full capture matrix (desktop/tablet/mobile, day/night, all states) vs fresh `main` baseline | Revert migration commit alone; template commit stays unused and harmless |
| S02 | List gate + `ListPageTemplate` | PR 3 | ~350 | `npm run lint && npm run build` | `impeccable context/harden/audit` session; dev server decision page | Revert commit; no page consumes it yet |
| S03 | Page 3 Listado de personal + list demo data | PR 4 | ~450 | `npm run lint && npm run build` | `npm run dev` → `/personal` all roles/states; re-run S01 Expediente capture subset | Revert commit; restores `PendingScreen` on `/personal` |
| S04 | Form gate + `FormPageTemplate`/`FormSection` | PR 5 | ~300 | `npm run lint && npm run build` | `impeccable context/harden/audit` session | Revert commit; no page consumes it yet |
| S05 | Page 6 Emisión de licencia (+ `licenses` feature) | PR 6 | ~500 | `npm run lint && npm run build` | `npm run dev` → `/personal/:id/licencia`, block-check states; re-run S01 button captures | Revert commit; restores `PendingScreen` on the route, Expediente button reverts to toast |
| S06 | Dashboard gate + `DashboardTemplate` + Page 2 (+ `alerts`) | PR 7 | ~550 | `npm run lint && npm run build` | `impeccable` session + `npm run dev` → `/panel` per role | Revert commit; restores `PendingScreen` on `/panel` |
| S07 | Auth gate + `AuthTemplate` + Page 1 Login (outside shell) | PR 8 | ~400 | `npm run lint && npm run build` | `impeccable` session + `npm run dev` → `/ingreso` | Revert commit; restores `PendingScreen` on `/ingreso`, "Cerrar sesión" reverts to disabled |
| S08 | Wave 1: `ErrorTemplate` alignment + Page 14 Perfil | PR 9 | ~350 | `npm run lint && npm run build` | `npm run dev` → `*` 404, a denied-role 403, `/perfil` | Revert commit; `ErrorTemplate` alignment must revert together with anything relying on the new structure (none yet) |
| S09 | Wave 1: Page 11 Usuarios y roles | PR 10 | ~400 | `npm run lint && npm run build` | `npm run dev` → `/usuarios` per role | Revert commit; restores `PendingScreen` on `/usuarios` |
| S10 | Wave 2: Page 5 Registro/edición de personal | PR 11 | ~450 | `npm run lint && npm run build` | `npm run dev` → `/personal/nuevo`, `/personal/:id/editar`; re-run S01 button captures | Revert commit; restores `PendingScreen`, Expediente "Editar datos" reverts to toast |
| S11 | Wave 3: Page 7 Certificado médico | PR 12 | ~350 | `npm run lint && npm run build` | `npm run dev` → `/personal/:id/certificado-medico`; re-run S01 button captures | Revert commit; restores `PendingScreen`, Expediente button reverts to toast |
| S12 | Wave 4: Page 8 Bloqueos | PR 13 | ~450 | `npm run lint && npm run build` | `npm run dev` → `/bloqueos` per role; re-run S01 button captures | Revert commit; restores `PendingScreen`, nav item removed, Expediente button reverts to toast |
| S13 | Wave 4: Page 12 Parámetros | PR 14 | ~350 | `npm run lint && npm run build` | `npm run dev` → `/parametros` | Revert commit; restores `PendingScreen` |
| S14 | Wave 5: Pages 9 Reportes + 10 Auditoría | PR 15 | ~550 | `npm run lint && npm run build` | `npm run dev` → `/reportes`, `/auditoria` per role | Revert either commit independently; each restores its own `PendingScreen` route |
| S15 | Wave 5: Page 13 Respaldos (conditional Q1) | PR 16 | ~250 | `npm run lint && npm run build` | `npm run dev` → `/respaldos` if built, or 404 if dropped | Revert commit; deletes or restores `PendingScreen` depending on Q1 answer |

Must-honor guard: this change stays inside `sryg-frontend`'s ESLint/`tsc -b` checks only (`strict_tdd: false`, no test runner per `openspec/config.yaml`). "Runtime harness" above is the closest available real-scenario check (dev server + Impeccable) since no automated E2E exists.

---

## Phase 0: Foundations (no gate — recommended as its own slice so it can land while the List gate waits)

- [x] 0.1 Create `src/demo/seed.ts`: `addDays`, `officeHourMinute`, and `mulberry32` seeded PRNG. No `Math.random`. — *Spec: demo-data "Data Generation Is Deterministic"*
- [x] 0.2 Create `src/demo/clock.ts`: `useDemoToday()` returning one `Date` per mount; `?hoy=YYYY-MM-DD` pins it. — *Spec: demo-data "Data Generation Is Deterministic" (fixed reference date scenario)*
- [x] 0.3 Create `src/demo/roster.ts`: `DemoScenario`, `DemoPersonSeed`, `DEMO_ROSTER` (demo-017 scenario `'bloqueada'`, matching `buildDemoExpediente`), `DEMO_PERSON_ID = 'demo-017'`. — *Spec: demo-data "DEMO_*_ID Constants Identify Default Entities"*
- [x] 0.4 Create `src/demo/useDemoStateOverride.ts`: reads `?estado=` and returns a value only if present in the caller's allow-list, else `null`. — *Spec: demo-data (state override contract, referenced by every page's states requirement)*
- [x] 0.5 Create `src/demo/useDemoResource.ts`: `useDemoResource<T>(key, build, options)` returns `Resource<T>` (`loading | error | ready` with `retry`/`update`), 400 ms simulated latency, `forceLoading`/`forceError`; derive `loading` from key mismatch (no synchronous `setState` in the effect, per React 19 `react-hooks` lint). — *Spec: demo-data "Only Containers Import The Data Module" (backend seam), "Data Generation Is Deterministic"*
- [x] 0.6 Create `src/app/routes.ts`: `PATHS` map, path builders (`personnelDetail`, `personnelEdit`, `licenseForm`, `medicalForm`), `HOME` (defaults to `personnelDetail(DEMO_PERSON_ID)`), importing only from `src/demo/roster`. — *Spec: app-routing "New Routes Are Added For Pages Without One", "Root Route Default Is Pending Q5"*
- [x] 0.7 Modify `src/features/personnel/data/demoData.ts`: re-export `DEMO_PERSON_ID` from `src/demo/roster` so existing imports keep working. — *Spec: demo-data "One Data Module Per Feature"*
- [x] 0.8 Modify `src/app/templates/ErrorTemplate.tsx`: import `HOME` from `src/app/routes.ts` instead of `features/personnel/data`; button label follows `HOME.label`. Props (`code`, `title`, `explanation`) and `role="alert"` unchanged. — *Spec: page-templates "Sibling Pages Compose The Chosen Template" (layering); design decision "single path registry and never imports features"*
- [x] 0.9 Modify `eslint.config.js`: add `no-restricted-imports` path-scoped rules — (a) `src/app/templates/**` and `src/design-system/**` must not import `src/features/**` or `src/demo/**`; (b) `src/features/*/{components,pages,domain}/**` must not import `**/data/**` or `src/demo/**`; (c) `src/features/<a>/**` must not import `src/features/<b>/**` (pattern per feature or restrict relative parent-directory climbs into sibling feature folders). — *Spec: demo-data "Only Containers Import The Data Module"*
- [x] 0.10 Create `openspec/changes/sryg-page-designs/pages-inventory.baseline.md`: byte-for-byte copy of `/home/jc/projects/sryg/docs/pages-inventory.md` (read-only source), taken before the next task. — *Design §Progress tracking*
- [x] 0.11 ⚠ EDIT AUTHORITY REQUIRED (path outside the git-tracked edit roots) — Modify `/home/jc/projects/sryg/docs/pages-inventory.md`: insert a `## Progreso` section after the introduction and before `## Páginas`, in Spanish, as a GitHub task list with one `- [ ]` item per page (1–15), each naming its template; add the "fuente de verdad: tasks.md" note. All 15 items start unchecked. This path is not under `/home/jc/projects/sryg/sryg-frontend`, so `sdd-apply` needs an explicit edit-authority grant for it, or the orchestrator edits it directly in the interactive session (design open question D3). — *Design §Progress tracking; Proposal §Progress tracking*
- [x] 0.12 Verify: `npm run lint && npm run build` pass.
- [x] 0.13 Commit: `chore(foundations): add demo-data kernel, route registry, and ESLint import boundaries` (work unit; includes 0.1–0.9). Track 0.10–0.11 (inventory files) in the same commit if edit authority is granted, otherwise as a follow-up commit once granted.

## Phase 1: S01 — DetailPageTemplate extraction + Expediente migration (3 commits, same-day baseline capture)

- [x] 1.1 Capture the fresh Expediente baseline from `main` before any code change: desktop 1440 / tablet 820 / mobile 390, day + night; `?pagina=medico|habilitaciones|bloqueos|historial`; sweep-end-night; resolve-dialog-day/resolved-night; loading/error/sin-alertas via `?estado=`; `?rol=consulta`; stack-open/drawer at 390; 404 at 390. Same calendar day as the post-migration capture (dates are relative to "today"). Store outputs in `.impeccable/review/`; comparison tooling stays in the session scratchpad. — *Design §Expediente migration, Regression-check procedure*
- [x] 1.2 Compare the fresh capture against the committed `.impeccable/review/` PNGs. If they differ, commit `chore(review): refresh Expediente baseline captures` using the fresh capture as the new reference. — *Note: `.impeccable/review/` is gitignored (untracked, never committed in this repo's history); refreshed the local baseline in place instead of a git commit — see apply-progress for detail.*
- [x] 1.3 Create `src/app/templates/templateTypes.ts`: `TemplateErrorContent`, `TemplateEmptyContent`. — *Design §Template contracts, Shared types and frames*
- [x] 1.4 Create `src/app/templates/TemplateFrames.tsx` + `.module.css`: shared loading/error/empty frames; error frame markup matches the Expediente's current `Notice tone="info"` + "Reintentar" for pixel parity.
- [x] 1.5 Create `src/design-system/atoms/Skeleton/Skeleton.tsx` + `.module.css`: skeleton block + `pulse` keyframes (reduced-motion safe), exported from `src/design-system/index.ts`; add one line under Components in `DESIGN.md`. — *Design §File Changes*
- [x] 1.6 Create `src/app/templates/DetailPageTemplate.tsx` + `.module.css`, extracted from `ExpedienteContainer`: `.page` root + `pageRef`/`stackRef` + ResizeObserver for `--measured-stack-height` (only while `status === 'ready'`); breadcrumb row; sticky full-bleed banner slot; live region; `PageKeys` row (desktop row / tablet bottom bar / phone sticky) with `getPageKeyDomIds` wiring; `panelWrap` with `role="tabpanel"`; loading frame (`loadingKeys`/`skeletonKey`); template does not render its own `<h1>` (the `header` slot owns it). — *Design §Template contracts, DetailPageTemplate; Spec: personnel-pages "Expediente Renders Through DetailPageTemplate Without Regression"*
- [x] 1.7 Modify `src/app/shell/AppShell.module.css`: declare `--shell-top-offset: 36px` on `.layout` and `--shell-main-pad` (`var(--s-6)`, `var(--s-5)` at ≤480px) on `.main`. Values unchanged, only exposed as custom properties.
- [x] 1.8 Create `src/features/personnel/components/ExpedienteHeaderSkeleton.tsx` + `.module.css`: identity skeleton (avatar, cédula, line bars) moved out of the container, passed as `headerSkeleton`.
- [x] 1.9 Verify: `npm run lint && npm run build` pass. Commit: `feat(templates): add DetailPageTemplate and Skeleton atom` (safe standalone commit — nothing consumes it yet).
- [x] 1.10 Modify `src/features/personnel/containers/ExpedienteContainer.tsx` + `.module.css`: compose `DetailPageTemplate`; remove the extracted layout CSS; keep the inline `useEffect` loader, `?estado=`/`?pagina=` validation, warnings, highlight/focus effect, `resolveBlock`, role checks, `IdentityHeader`, panels, `ConfirmDialog`, and the person-not-found 404 path unchanged. — *Design §Expediente migration, What moves and what stays; §Decision: The Expediente keeps its own loader in this change*
- [x] 1.11 DOM parity check: for ready (each tab), loading, and error, diff `document.querySelector('main').outerHTML` with `class` attributes stripped, before vs after. Any non-CSS-explainable difference is a defect. — *0 mismatches across 8 states (6 tabs + loading + error)*
- [x] 1.12 Behavior parity pass: tab order, arrow keys on the page keys, Enter on a highlighted warning row focuses it, live-region text, `?pagina=` replace semantics, Consulta does not see Historial. — *All 8 checks passed*
- [x] 1.13 Compare all captured screenshots from 1.1 one by one against the post-migration state. Any pixel difference is a defect unless the user explicitly accepts it. — *Spec: personnel-pages "Post-migration capture matches the pre-migration baseline", "Blocked banner remains persistent across tabs after migration", "Consulta retains read-only access after migration". 20/20 captures compared; the only pixel differences are the shell clock text ticking between the two capture runs (confirmed visually) — no layout/structural defect.*
- [x] 1.14 Verify: `npm run lint && npm run build` pass.
- [x] 1.15 Commit: `refactor(personnel): compose Expediente on DetailPageTemplate` (revertible alone). — *Spec: personnel-pages "Extraction and migration are separable"*
- [x] 1.16 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 4 to checked, and check tasks 1.1–1.15 in this file (same session).

## Phase 2: S02 — HUMAN GATE (List) + ListPageTemplate

- [x] 2.1 **HUMAN GATE — List direction.** Orchestrator runs `impeccable context --target src/features/personnel/pages/ListadoPage.tsx` in the interactive session, relays its 2–3 questions losslessly, answers with task/data/states/frequency/constraints for the Listado de personal reference page. Then runs the dev server, relays Impeccable's three proposed structures as a complete choice envelope, and waits for the user to pick (or steer/re-roll: `plain`, `safer`, `bolder`, canon). The executor never picks, defaults, or infers. This task blocks 2.3–2.5 and Phase 3. — *Spec: page-templates "Direction Choice Gate For New Templates"*
- [x] 2.2 Impeccable records the chosen direction in `.impeccable/surfaces/src-features-personnel-pages-listadopage-tsx.md`. Commit: `docs(impeccable): record List direction`. — *Spec: page-templates "Chosen direction is recorded before the template is built"*
- [x] 2.3 Create `src/app/templates/ListPageTemplate.tsx` + `.module.css` per the chosen direction, implementing the minimum contract: `title` (template renders `<h1>`), `breadcrumb`, `summary`, `primaryAction` (rendered only if the container's `can()` allows it), `toolbar`, `banner`, `overlays`; states `loading | error | empty | ready` (with `pagination`). `title`/`breadcrumb`/`toolbar` render in every status except `error`. "Blocked" stays a row state via `StatusBadge`, not a page state. — *Design §Template contracts, ListPageTemplate*
- [x] 2.4 Verify: `npm run lint && npm run build` pass.
- [x] 2.5 Commit: `feat(templates): add ListPageTemplate`. — *commit `384bdf6`*

## Phase 3: S03 — Page 3 Listado de personal + list demo data

- [x] 3.1 Modify `src/features/personnel/data/demoData.ts`: add `buildExpedienteFor(id, today): ExpedienteData | undefined` (returns `buildDemoExpediente(today)` byte-identical for `demo-017`; builds from `scenario` for other roster people; `undefined` triggers the 404) and list-row builders. — *Design §Decision: Rows in the Listado must open a real Expediente. Deviation: also expanded `src/demo/roster.ts`'s `DEMO_ROSTER` from 8 to 1,240 deterministic entries (seeded via `mulberry32`) so the registry reads as "thousands", per the committed List direction brief's proof line ("the registry holds thousands of people"). `DEMO_ROSTER` had zero other importers at the time, so this is additive, not a breaking change.*
- [x] 3.2 Verify demo-017 identity: `JSON.stringify(buildExpedienteFor('demo-017', d)) === JSON.stringify(buildDemoExpediente(d))`, checked in the dev console. — *Verified via a scratchpad tsx script: `identical: true`.*
- [x] 3.3 Create `src/features/personnel/pages/ListadoPage.tsx`, its container, and components (search/filter toolbar, dense table for desktop, field-usable layout for phone) on `ListPageTemplate`. Change `ExpedienteContainer`'s `id !== DEMO_PERSON_ID` check to "the builder returned `undefined`". — *Spec: personnel-pages "Personnel List Supports Search And Role-Dependent Actions". Components: `PersonnelAnnunciator` (lamp-key summary), `PersonnelSearchField` (56px lookup field, "/" focus shortcut), `PersonnelTable` (dense grid desktop/tablet, stacked cards ≤480px).*
- [x] 3.4 Modify `src/app/App.tsx`: add `/personal` route rendering `ListadoPage` (replaces `PendingScreen`). — *Spec: app-routing "Built Pages Replace PendingScreen Routes"*
- [x] 3.5 Wire role-dependent primary action: Consulta sees the list without a create action; Administrador/Supervisor see it. Wire `?estado=` allow-list (`cargando`, `error`, `vacio`) and filtering behavior. — *Spec: personnel-pages "Consulta sees the list without a create action", "Administrador sees the create action", "Filtering narrows the result set", "List covers its required states". "Nuevo personal" is a demo toast for now (Registro lands in S10), following the same pattern as the Expediente's not-yet-built action buttons.*
- [x] 3.6 Re-run the relevant S01 capture subset (`/personal/demo-017` ready state) to confirm the new list-to-detail navigation introduces no Expediente regression. — *Day+night captures at 1440 compared against the committed `.impeccable/review/desktop{,-night}.png` baseline: 0.22%/0.01% pixel diff, confirmed visually as only the shell clock/date text (captured on a different calendar day) — no layout/structural regression. A Listado row (`demo-001`, non-demo-017) was clicked and confirmed to navigate to and render its own real Expediente (`h1` = its cédula).*
- [x] 3.7 Run `impeccable harden` and `impeccable audit` on the Listado page; fix findings in one batch; confirm once. — Done as the Impeccable finish review (2 rounds, disposition fix twice); user accepted shipping with 2 open items, see 3.11. — *Deferred: orchestrator runs the Impeccable finish review.*
- [x] 3.8 Verify: `npm run lint && npm run build` pass.
- [x] 3.9 Commit: `feat(personnel): add Listado de personal on ListPageTemplate`.
- [x] 3.10 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 3 to checked, and check tasks 3.1–3.9 in this file.

- [ ] 3.11 **Follow-up (accepted open items from the Listado finish review, 2026-09-29):** (a) the pressed annunciator key loses its inverted fill on hover because `.key:hover:not(:disabled)` outranks `.selected:hover` in `PersonnelAnnunciator.module.css`; (b) phone rows (≤480px) drop Categoría because the `max-width: 1024px` rule in `PersonnelTable.module.css` also covers phone. Also capture an 820 tablet state with results.

## Phase 4: S04 — HUMAN GATE (Form) + FormPageTemplate

- [x] 4.1 **HUMAN GATE — Form direction.** Orchestrator runs `impeccable context --target src/features/licenses/pages/EmisionLicenciaPage.tsx`, relays questions and the three proposed structures, waits for the user's pick/steer/re-roll. Blocks 4.3–4.4 and Phase 5. — *Spec: page-templates "Direction Choice Gate For New Templates"*
- [x] 4.2 Impeccable records the direction in `.impeccable/surfaces/src-features-licenses-pages-emisionlicenciapage-tsx.md`. Commit: `docs(impeccable): record Form direction`.
- [x] 4.3 Create `src/app/templates/FormPageTemplate.tsx`, `FormSection.tsx` + css per the chosen direction: `<form noValidate>`; states `loading | error | blocked | editing | submitting`; while `submitting`, wrap sections in `<fieldset disabled>` with `aria-busy`; `blocked` uses `BLOCKED_STATE_LABEL` from the design system (DS-05/OD-07 stand-in) and never shows a submit button. — *Design §Template contracts, FormPageTemplate and FormSection. The template renders a `StatusBadge status="bloqueada"` in its blocked branch, so `BLOCKED_STATE_LABEL` is consumed indirectly via `STATUS_META` (one token to change) rather than re-typed in template code; `blocked.title`/`blocked.reason` stay page-owned free text. `rail` is an optional slot (per the orchestrator's brief) only on `editing`/`submitting`, stacked with `actions` in one sticky card at desktop and folded into a sticky bottom bar at tablet/phone; pages without a rail (Perfil, Parámetros) render `actions` as a plain bottom row.*
- [x] 4.4 Verify: `npm run lint && npm run build` pass.
- [x] 4.5 Commit: `feat(templates): add FormPageTemplate and FormSection`.

## Phase 5: S05 — Page 6 Emisión/renovación de licencia (+ `licenses` feature)

- [x] 5.1 Create `src/features/licenses/` (`domain/types.ts`, `data/demoData.ts`, `containers/`, `components/`, `pages/EmisionLicenciaPage.tsx`) on `FormPageTemplate`, mirroring the `personnel` feature layout. — *`data/demoData.ts` builds its own deterministic view of a person's license/ratings from `src/demo/roster.ts`'s shared scenario (never from `personnel`'s data module, per the ESLint layering rule); `demo-017` always carries an open block, matching the Expediente. Components: `LicenseSubjectStrip` (compact identity strip for the `subject` slot), `LicenseSection`, `RatingsSection` (include checkbox + editable new-expiry date per rating — the signature interaction), `LicenseSummaryRail` ("Se emitirá" list, collapses to a count line at tablet/phone).*
- [x] 5.2 Implement the block check before submission: block check passes → submission proceeds; block check fails → submission disabled, `blocked` status shown with `BLOCKED_STATE_LABEL`. — *Spec: credential-forms "License Issue/Renew Runs The Block Check Before Submission". The check runs when the page opens (container branches to `status="blocked"` before rendering any section/rail), not at submit, per the committed direction contract. `?estado=bloqueado` also forces it (added to the allow-list alongside `cargando`, `error`) so the blocked page is reachable for a non-blocked demo person.*
- [x] 5.3 Cover required states (loading, error, blocked, editing, submitting). — *Spec: credential-forms "License form covers its required states". All 5 states captured (see 5.6/verification); found and fixed a bug during capture: an empty/invalid date rendered "NaN undefined NaN" in the summary rail — `formatDate` now returns "—" for an empty or unparseable ISO string.*
- [x] 5.4 Surface license history inside the Expediente's licencias/historial tab. — *Spec: credential-forms "License And Medical History Live Inside The Expediente". Already satisfied structurally: the Expediente's existing `historial` tab (built in S01/foundations) lists `AuditEntry` rows with `entidad: 'Licencia'`/`'Habilitación'` for both `buildDemoExpediente` and `buildExpedienteFromScenario`; no separate route or page was added, and none is needed — submission here is a mocked demo session with no cross-feature data write (per the orchestrator's scope note), so there is nothing further to surface.*
- [x] 5.5 Modify `src/app/App.tsx`: add `/personal/:id/licencia` route gated by `RequirePermission` on `licenses:issueRenew`.
- [x] 5.6 Modify the Expediente's "Emitir o renovar" action from a toast to `navigate(licenseForm(id))`; re-run the S01 captures affected by that button and its disabled state. — *`demo-001` (roster scenario `proxima`, no open block) is the editable-path person: confirmed `can('licenses:issueRenew')`-gated button renders enabled and navigates to `/personal/demo-001/licencia`. Re-captured `/personal/demo-017` day+night at 1440×900 (matching the committed baseline's exact viewport) and pixel-diffed: 0.223%/0.016% diff, visually confirmed as only the shell clock/date text and demo dates relative to "today" (captured on a different calendar day) — zero structural/layout regression, same pattern as S03's 3.6 check.*
- [x] 5.7 Run `impeccable harden` + `impeccable audit`; fix in one batch. — *Finish-review fixes landed in `bc37b0c`: the blocked state reuses the Expediente warning-row grammar (Lamp + caps title + detail) instead of StatusBadge + Notice; the subject slot and breadcrumb keep their shape across loading/error/blocked/ready; rating rows label the include checkbox with the rating name. Lint + build pass. RDD assess: medium, under_budget (pending in slice).*
- [x] 5.8 Verify: `npm run lint && npm run build` pass.
- [x] 5.9 Commit: `feat(licenses): add Emisión/renovación de licencia on FormPageTemplate`.
- [x] 5.10 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 6 to checked, and check tasks 5.1–5.9 in this file.

## Phase 6: S06 — HUMAN GATE (Dashboard) + DashboardTemplate + Page 2 (+ `alerts`)

- [ ] 6.1 **HUMAN GATE — Dashboard direction.** Orchestrator runs `impeccable context --target src/features/alerts/pages/PanelPage.tsx`, relays questions and three structures, waits for the user's pick/steer/re-roll. Blocks 6.5–6.10 and any later slice consuming the Dashboard. — *Spec: page-templates "Direction Choice Gate For New Templates"*
- [ ] 6.2 Impeccable records the direction in `.impeccable/surfaces/src-features-alerts-pages-panelpage-tsx.md`. Commit: `docs(impeccable): record Dashboard direction`.
- [ ] 6.3 Create `src/app/templates/DashboardTemplate.tsx` + css per the chosen direction: `regions: DashboardRegion[]` with stable `id`s (so a role switch does not reorder remaining regions); states `loading | error | empty | ready`; template never branches on role (container filters `regions`); must respect the `design.json` rule against KPI-card layouts. — *Design §Template contracts, DashboardTemplate*
- [ ] 6.4 Verify: `npm run lint && npm run build` pass. Commit: `feat(templates): add DashboardTemplate`.
- [ ] 6.5 Create `src/features/alerts/` (`domain/`, `data/demoData.ts`, `containers/`, `components/`, `pages/PanelPage.tsx`) on `DashboardTemplate`.
- [ ] 6.6 Implement role-dependent content: Administrador sees the full dashboard; Consulta sees a restricted dashboard. — *Spec: alerts-dashboard "Dashboard Shows Role-Dependent Alert And Status Content"*
- [ ] 6.7 Implement filtering by near-expiry and drill-through from an alert count to the filtered list. — *Spec: alerts-dashboard "Dashboard Alerts Support Filtering And Drill-Through"*
- [ ] 6.8 Implement alert acknowledgement from the Dashboard. **Conditional D2**: if the runbook §6 restricts acknowledgement by role, add `alerts:acknowledge` to `src/app/role/permissions.ts` with a comment citing the inventory role column and OD-14; otherwise gate with the existing role matrix only. — *Spec: alerts-dashboard "Alert Acknowledgement Lives On The Dashboard"; Design open question D2*
- [ ] 6.9 Cover required states: warning state when blocks are present, empty state ("sin alertas"). — *Spec: alerts-dashboard "Dashboard Covers Its Required States"*
- [ ] 6.10 Modify `src/app/App.tsx`: add `/panel` route (no route-level gate; acknowledge action gated in the page).
- [ ] 6.11 **Conditional Q5**: root redirect stays at the demo Expediente (`HOME` unchanged) unless the user resolves Q5 ("should `/` redirect to `/panel` instead?"). If resolved to yes, change `HOME` in `src/app/routes.ts` to `{ path: PATHS.panel, ... }` in this same slice. — *Spec: alerts-dashboard "Root Redirect To The Dashboard Is Pending Q5"; Proposal Q5*
- [ ] 6.12 Run `impeccable harden` + `impeccable audit`; fix in one batch.
- [ ] 6.13 Verify: `npm run lint && npm run build` pass.
- [ ] 6.14 Commit: `feat(alerts): add Dashboard on DashboardTemplate`.
- [ ] 6.15 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 2 to checked, and check tasks 6.1–6.14 in this file.

## Phase 7: S07 — HUMAN GATE (Auth) + AuthTemplate + Page 1 Login (outside shell)

- [ ] 7.1 **HUMAN GATE — Auth direction.** Orchestrator runs `impeccable context --target src/features/auth/pages/LoginPage.tsx`, relays questions and three structures, waits for the user's pick/steer/re-roll. Blocks 7.3, 7.5–7.9. — *Spec: page-templates "Direction Choice Gate For New Templates"*
- [ ] 7.2 Impeccable records the direction in `.impeccable/surfaces/src-features-auth-pages-loginpage-tsx.md`. Commit: `docs(impeccable): record Auth direction`.
- [ ] 7.3 Create `src/app/templates/AuthTemplate.tsx` + css per the chosen direction: `placement: 'standalone' | 'inShell'`; `standalone` renders a full-viewport frame with brand, the `DATOS DE DEMOSTRACIÓN` tag, a reachable day/night control (reuse `app/shell/ThemeKeys`), and the panel; `inShell` renders only the panel; `live?: 'alert'` slot. — *Design §Template contracts, AuthTemplate*
- [ ] 7.4 Verify: `npm run lint && npm run build` pass. Commit: `feat(templates): add AuthTemplate`.
- [ ] 7.5 Create `src/features/auth/` (`domain/`, `data/demoData.ts`, `containers/`, `components/`, `pages/LoginPage.tsx`) on `AuthTemplate` (`standalone`); mock submit calls `navigate(HOME.path, { replace: true })`.
- [ ] 7.6 Implement valid/invalid mock submission and required-states coverage. — *Spec: auth-pages "Login Authenticates And Routes Into The Shell (Mocked)", "Login covers its required states"*
- [ ] 7.7 **Conditional Q3**: by default, omit the "olvidé mi contraseña" link (`AuthTemplate.footer`). If the user resolves Q3 to add recovery, add `/ingreso/recuperar` as another `standalone` sibling page and its AUTH task in this slice. — *Spec: auth-pages "Login's Forgot-Password Affordance Is Pending Q3"; Proposal Q3*
- [ ] 7.8 Modify `src/app/App.tsx`: add `/ingreso` route, a sibling of the shell layout route, still inside `RoleProvider`/`ToastProvider`/`ThemeProvider`, rendered outside `AppShell`. — *Spec: app-routing "Login Renders Outside AppShell"*
- [ ] 7.9 Modify `src/app/shell/RoleMenuContent.tsx`: disabled "Cerrar sesión" becomes a link to `/ingreso`.
- [ ] 7.10 Run `impeccable harden` + `impeccable audit`; fix in one batch.
- [ ] 7.11 Verify: `npm run lint && npm run build` pass.
- [ ] 7.12 Commit: `feat(auth): add Login on AuthTemplate`.
- [ ] 7.13 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 1 to checked, and check tasks 7.1–7.12 in this file.

## Phase 8: Wave 1 (S08) — Page 15 ErrorTemplate alignment + Page 14 Perfil

- [ ] 8.1 Modify `src/app/templates/ErrorTemplate.tsx`: become a thin wrapper rendering `AuthTemplate placement="inShell"`; preserve `code`/`title`/`explanation` props and `role="alert"` unchanged. — *Spec: page-templates "ErrorTemplate inherits AuthTemplate's structure"*
- [ ] 8.2 Verify `RequirePermission`'s 403 path, the `*` 404 route, and the Expediente's person-not-found path all still render correctly with no prop/behavior change required.
- [ ] 8.3 Create `src/features/auth/pages/PerfilPage.tsx` (+ container/components) on `FormPageTemplate` (already directioned via the Auth gate): read-only account fields and a password-change flow (mocked). — *Spec: auth-pages "Profile Page Shows Own Account Info And Password Change"*
- [ ] 8.4 Cover Perfil's required states. — *Spec: auth-pages "Profile covers its required states"*
- [ ] 8.5 Modify `src/app/App.tsx`: add `/perfil` route (no gate — all roles).
- [ ] 8.6 Run `impeccable harden` + `impeccable audit` on Perfil; fix in one batch.
- [ ] 8.7 Verify: `npm run lint && npm run build` pass.
- [ ] 8.8 Commit: `feat(auth): align ErrorTemplate to AuthTemplate and add Perfil page`.
- [ ] 8.9 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso items 14 and 15 to checked, and check tasks 8.1–8.8 in this file.

## Phase 9: Wave 1 (S09) — Page 11 Usuarios y roles

- [ ] 9.1 Create `src/features/users/` (`domain/`, `data/demoData.ts`, `containers/`, `components/`, `pages/UsuariosPage.tsx`) on `ListPageTemplate` (inherits the List direction; extension only, no new gate). — *Spec: page-templates "A sibling page reuses the recorded direction"*
- [ ] 9.2 Modify `src/app/App.tsx`: add `/usuarios` route gated `RequirePermission` on `users:admin`. — *Spec: administration-pages "User And Role Administration Is Administrador-Only"*
- [ ] 9.3 Implement destructive confirmation when deactivating a user. — *Spec: administration-pages "Deactivating a user requires destructive confirmation"*
- [ ] 9.4 Cover required states. — *Spec: administration-pages "Usuarios y roles covers its required states"*
- [ ] 9.5 Run `impeccable harden` + `impeccable audit`; fix in one batch.
- [ ] 9.6 Verify: `npm run lint && npm run build` pass.
- [ ] 9.7 Commit: `feat(users): add Usuarios y roles on ListPageTemplate`.
- [ ] 9.8 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 11 to checked, and check tasks 9.1–9.7 in this file.

## Phase 10: Wave 2 (S10) — Page 5 Registro/edición de personal

- [ ] 10.1 Create `src/features/personnel/pages/RegistroPersonalPage.tsx` (+ container/components) on `FormPageTemplate`, covering both create and edit modes.
- [ ] 10.2 Modify `src/app/App.tsx`: add `/personal/nuevo` (gated `personnel:write`) and `/personal/:id/editar` (gated `personnel:write`) routes. Confirm React Router ranks the static `nuevo` segment above `:id`.
- [ ] 10.3 Implement Consulta-denied access, edit-mode pre-fill, save/cancel behavior, field-level validation errors, and a photo-upload fallback. — *Spec: personnel-pages "Consulta cannot reach Registro", "Edit mode pre-fills existing data", "Save and cancel behave as expected", "Validation failure surfaces field-level errors", "Photo upload has a fallback"*
- [ ] 10.4 Modify the Expediente's "Editar datos" action from a toast to `navigate(personnelEdit(id))`; re-run the S01 captures affected by that button.
- [ ] 10.5 Run `impeccable harden` + `impeccable audit`; fix in one batch.
- [ ] 10.6 Verify: `npm run lint && npm run build` pass.
- [ ] 10.7 Commit: `feat(personnel): add Registro/edición de personal on FormPageTemplate`.
- [ ] 10.8 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 5 to checked, and check tasks 10.1–10.7 in this file.

## Phase 11: Wave 3 (S11) — Page 7 Certificado médico

- [ ] 11.1 Create `src/features/medical-certificates/` (`domain/`, `data/demoData.ts`, `containers/`, `components/`, `pages/CertificadoMedicoPage.tsx`) on `FormPageTemplate`.
- [ ] 11.2 Ensure the form has no clinical fields and a persistent no-clinical-data notice. — *Spec: credential-forms "The form has no clinical fields", "The no-clinical-data notice is persistent"*
- [ ] 11.3 Apply the same blocked-state pattern as the license form. — *Spec: credential-forms "Medical form applies the same blocked-state pattern"*
- [ ] 11.4 Gate submission to Administrador only, per the role matrix. — *Spec: credential-forms "A non-Administrador role cannot submit"*
- [ ] 11.5 Surface medical-certificate history inside the Expediente's historial tab.
- [ ] 11.6 Modify `src/app/App.tsx`: add `/personal/:id/certificado-medico` route gated `medical:write`.
- [ ] 11.7 Modify the Expediente's "Registrar o renovar certificado" action from a toast to a navigation; re-run the affected S01 captures.
- [ ] 11.8 Run `impeccable harden` + `impeccable audit`; fix in one batch.
- [ ] 11.9 Verify: `npm run lint && npm run build` pass.
- [ ] 11.10 Commit: `feat(medical-certificates): add Certificado médico on FormPageTemplate`.
- [ ] 11.11 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 7 to checked, and check tasks 11.1–11.10 in this file.

## Phase 12: Wave 4 (S12) — Page 8 Bloqueos

- [ ] 12.1 Modify `src/app/role/permissions.ts`: add `blocking:view` (Administrador, Supervisor), with a comment citing the inventory role column and OD-14. — *Design §Decision: Route-level gates ... two stand-in permissions at most*
- [ ] 12.2 Create `src/features/validation-blocking/` (`domain/`, `data/demoData.ts`, `containers/`, `components/`, `pages/BloqueosPage.tsx`) on `ListPageTemplate` (extension, no new gate).
- [ ] 12.3 Implement block registration and filtering to open blocks. — *Spec: blocking-management "Registering a new block", "Filtering to open blocks"*
- [ ] 12.4 Gate registration by the role matrix (Consulta cannot register). — *Spec: blocking-management "Consulta cannot register a block"*
- [ ] 12.5 Implement resolve with a specific-consequence confirmation dialog and an audit-entry write. — *Spec: blocking-management "Resolve shows a specific-consequence confirmation", "Resolving a block writes an audit entry"*
- [ ] 12.6 **Conditional Q6 (informational stand-in, OD-08)**: resolve access follows the current stand-in grant; add a comment noting that a future OD-08 resolution changes only `permissions.ts`. — *Spec: blocking-management "Resolve Access Is Pending OD-08"*
- [ ] 12.7 Cover the empty state (no blocks exist). — *Spec: blocking-management "Bloqueos Covers Its Required States"*
- [ ] 12.8 Modify `src/app/App.tsx`: add `/bloqueos` route gated `blocking:view`.
- [ ] 12.9 Modify `src/app/shell/nav-items.ts`: add the Bloqueos item with `permission: 'blocking:view'`, outside the admin group. — *Spec: app-routing "A new top-level page appears in navigation"*
- [ ] 12.10 Modify the Expediente's "Registrar bloqueo" action from a toast to a navigation; re-run the affected S01 captures.
- [ ] 12.11 Run `impeccable harden` + `impeccable audit`; fix in one batch.
- [ ] 12.12 Verify: `npm run lint && npm run build` pass.
- [ ] 12.13 Commit: `feat(validation-blocking): add Bloqueos on ListPageTemplate`.
- [ ] 12.14 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 8 to checked, and check tasks 12.1–12.13 in this file.

## Phase 13: Wave 4 (S13) — Page 12 Parámetros

- [ ] 13.1 Create `src/features/settings/` (`domain/`, `data/demoData.ts`, `containers/`, `components/`, `pages/ParametrosPage.tsx`) on `FormPageTemplate` (extension, no new gate).
- [ ] 13.2 **Conditional Q4**: default to one grouped page with one `FormSection` per category. If the user resolves Q4 to per-module settings pages instead, split into multiple routes reusing the same template. — *Spec: administration-pages "Parámetros Grouping Is Pending Q4"; Proposal Q4*
- [ ] 13.3 Gate the page to Administrador only, and show a confirmation on saving a parameter. — *Spec: administration-pages "Non-Administrador roles cannot reach Parámetros", "Saving a parameter shows a confirmation"*
- [ ] 13.4 Cover required states. — *Spec: administration-pages "Parámetros covers its required states"*
- [ ] 13.5 Modify `src/app/App.tsx`: add `/parametros` route gated `settings:admin`.
- [ ] 13.6 Run `impeccable harden` + `impeccable audit`; fix in one batch.
- [ ] 13.7 Verify: `npm run lint && npm run build` pass.
- [ ] 13.8 Commit: `feat(settings): add Parámetros on FormPageTemplate`.
- [ ] 13.9 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 12 to checked, and check tasks 13.1–13.8 in this file.

## Phase 14: Wave 5 (S14) — Pages 9 Reportes + 10 Auditoría

- [ ] 14.1 Create `src/features/reports/` (`domain/`, `data/demoData.ts`, `containers/`, `components/`, `pages/ReportesPage.tsx`) on `ListPageTemplate` (extension, no new gate).
- [ ] 14.2 Implement Administrador run/export and Consulta's limited read access. **Note (Q6 stand-in, informational, OD-10)**: the export action exists without a committed export format. — *Spec: reports-audit "Administrador runs and exports a report", "Consulta has limited read access", "Report Export Format Is Pending OD-10"*
- [ ] 14.3 Cover Reportes' required states. — *Spec: reports-audit "Reports covers its required states"*
- [ ] 14.4 Create `src/features/audit/` (`domain/`, `data/demoData.ts`, `containers/`, `components/`, `pages/AuditoriaPage.tsx`) on `ListPageTemplate`.
- [ ] 14.5 Gate the audit viewer (Consulta cannot reach it) and implement filtering. — *Spec: reports-audit "Consulta cannot reach the audit viewer", "Filtering the audit trail", "Audit viewer covers its required states"*
- [ ] 14.6 Surface per-person audit history inside the Expediente's historial tab with `AuditLogTable`. — *Spec: reports-audit "Per-Person Audit History Lives Inside The Expediente"*
- [ ] 14.7 Modify `src/app/App.tsx`: add `/reportes` (no gate; Consulta limited in page) and `/auditoria` (gated `audit:view`) routes.
- [ ] 14.8 Run `impeccable harden` + `impeccable audit` on both pages; fix in one batch.
- [ ] 14.9 Verify: `npm run lint && npm run build` pass.
- [ ] 14.10 Commit: `feat(reports): add Reportes on ListPageTemplate`.
- [ ] 14.11 Commit: `feat(audit): add Visor de auditoría on ListPageTemplate`.
- [ ] 14.12 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso items 9 and 10 to checked, and check tasks 14.1–14.11 in this file.

## Phase 15: Wave 5 (S15, conditional Q1) — Page 13 Respaldos

- [ ] 15.1 **CONDITIONAL Q1 — blocking.** Confirm with the user, before starting this phase, whether page 13 (Respaldos) exists or OPS-04 resolves it with an operations runbook instead. If dropped, confirm what happens to the `/respaldos` route and its nav item. — *Spec: administration-pages "Respaldos Existence And Content Are Pending Q1"; Proposal Q1*
- [ ] 15.2 If Q1 resolves to "build": create `src/features/settings/pages/RespaldosPage.tsx` (+ container/components) on `DashboardTemplate` (extension, no new gate). If Q1 resolves to "drop": skip to 15.4.
- [ ] 15.3 If built: cover required states and gate the page `backups:view`.
- [ ] 15.4 Modify `src/app/App.tsx`: if built, replace `PendingScreen` on `/respaldos` with `RespaldosPage`. If dropped, remove the `/respaldos` route and its nav item entry in `src/app/shell/nav-items.ts` (unknown path falls to 404).
- [ ] 15.5 Delete `src/app/templates/PendingScreen.tsx` + css — this is the last slice with any route depending on it, per either Q1 outcome. — *Spec: app-routing "PendingScreen Retirement Is Deferred To Its Last Usage"*
- [ ] 15.6 If built, run `impeccable harden` + `impeccable audit`; fix in one batch.
- [ ] 15.7 Verify: `npm run lint && npm run build` pass.
- [ ] 15.8 Commit: `feat(settings): resolve Respaldos per Q1 and retire PendingScreen`.
- [ ] 15.9 Update `/home/jc/projects/sryg/docs/pages-inventory.md` Progreso item 13 to checked (or annotated as dropped, per Q1), and check tasks 15.1–15.8 in this file.

## Not Planned (out of scope unless resolved)

- **Q2 — Page 16 (credential on-screen preview).** Out of scope for this change. If Q2 resolves to "build it" during or after this change, it becomes `/personal/:id/credencial` on the existing `DetailPageTemplate` composition pattern (per design), and needs its own follow-up slice — not numbered here.
