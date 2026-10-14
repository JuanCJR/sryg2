# Feature: sryg-design-system

## Objective

Build the SRYG design system (DS-01..DS-06 from `../docs/sryg-definitions-and-tasks.md`) in the "Crew Alerting" direction and prove it on the Expediente (personnel detail) at desktop, tablet, and phone with synthetic data.

## Problem and why

`sryg-frontend` is a stock Vite + React 19 scaffold. Every later feature (personnel, licenses, medical, blocking, alerts, reports) needs shared tokens, components, and a role-aware shell. Building the system against a real, dense screen keeps it honest.

## Scope (authorized)

- Tokens for day and night modes, fonts, base browser surfaces.
- Atoms, molecules, StatusBadge with the OD-07 name behind one token.
- Role-gated app shell (Administrador, Supervisor, Consulta), 403/404/pending templates.
- Expediente with all six page keys, states (loading, error, normal, blocked), warning stack, signature interaction.
- Dev-only component catalog route.

Out of scope: real API, auth, other feature screens beyond placeholders, test-runner setup (SCF-08 / OD-11).

## Constraints

- Direction contract: `.impeccable/surfaces/src-features-personnel-pages-expedientepage-tsx.md` (authoritative for visual decisions).
- Product truth: `PRODUCT.md`.
- es-VE UI copy. WCAG 2.2 AA both modes. Status = lamp + icon + label. 44px targets on touch widths.
- Hue only on status. No clinical data. Synthetic data must read as synthetic.
- Feature-first folders, atomic design, container-presentational split.

## TDD and checks

- TDD mode: **off**. Source: no project or session TDD configuration and no test runner installed (OD-11 open). Ordinary functional checks apply.
- Checks per task: `npm run lint`, `npm run build` (includes `tsc -b`).
- Closure checks: Playwright screenshots at 1440 / 820 / 390 in day and night, contrast check of token pairs, `impeccable detect`, finish review, DESIGN.md.

## Delivery

- Forecast: ~3,500 authored changed lines (additions + deletions), above the ~400 budget.
- Strategy: ask-on-risk (default). Chain strategy: **stacked-to-main** (user, 2026-09-26). Each slice must leave `main` valid on its own.
- No remote configured; pull requests are not created yet.

## Tasks

| ID | Task | Route | Trigger evidence | Status | Commit | Review |
|---|---|---|---|---|---|---|
| T1 | Foundations: deps (react-router, lucide-react, @fontsource/b612, @fontsource/b612-mono), tokens (n-0..n-10 ramp, semantic day/night, status lamps), base CSS (reset, selection, caret, scrollbar, focus, tabular figures), ThemeProvider (system + persisted toggle), index.html es-VE, remove scaffold assets | delegated | writer trigger: 2+ non-trivial files | done | 49e4ce8 | see Progress |
| T2 | Atoms: Button, IconButton, Input, Select, DateInput, Checkbox, Radio, Label, Icon, Lamp, Avatar, Tooltip | delegated | writer trigger | done | 3288158 | see Progress |
| T3 | Molecules: credential-status module (OD-07 token), StatusBadge, FormField, Notice, SearchBar, PageKeys, Breadcrumb, Pagination, ConfirmDialog (type-to-confirm), Toast | delegated | writer trigger | done | 8d06ada | see Progress |
| T3b | Review follow-ups: ConfirmDialog typed-reset on every close path + useId, PageKeys reachable when activeId unknown + namespaced ids, Tooltip chains handlers/aria-describedby, Breadcrumb keys + valid list markup, Avatar onError fallback, Pagination figures-only mono | delegated | writer trigger | done | 671405b | approved (split review, see Progress) |
| T4 | App shell: TopStrip, NavRail + drawer, role provider with demo switch, skip link, router, ErrorTemplate (403/404), pending-screen template | delegated | writer trigger | done | 2387fed | approved (split review, see Progress) |
| T5 | Expediente: domain types, synthetic data, warning derivation, container with states, WarningStack + signature interaction, identity header, six panels, historial filters + pagination, resolve-block dialog | delegated | writer trigger | done | 82761d6 | approved (split review, see Progress) |
| T6 | Catalog: dev-only `/catalogo` documenting tokens and components | delegated | writer trigger | done | 6c7802c | approved (split review, see Progress) |
| T7 | Finish: screenshots, detect, finish review, fixes, DESIGN.md via documenter | inline + agents | per-action review workers | done | see Progress | finish review: ship |

## Acceptance criteria

- Expediente answers "are this person's credentials in order, and why not" in one glance at 1440, 820, 390, day and night.
- Open block pinned above every page key; selecting a warning switches page and highlights linked credentials.
- Every status shows lamp + icon + text; contrast AA verified for token pairs.
- Consulta sees no create/issue/resolve actions; admin-only nav hidden for other roles.
- `npm run lint` and `npm run build` pass.
- DESIGN.md and `.impeccable/design.json` exist and describe the built system.

## Progress

- 2026-09-26: git initialized; base commit `017323e` on `main`; branch `feat/design-system`. Direction contract written (seed e177196d).
- 2026-09-26: T1–T3 done by delegated writer (sonnet). Writer evidence: `npm run lint` clean and `npm run build` passing after each task. Parent spot check: lint clean, build passes (243.78 kB JS / 20.49 kB CSS); tokens match spec. Deviations accepted: DateInput/Select share Input.module.css; IconButton has one size; Loader2 spinner. ConfirmDialog resets typed value on close (React Compiler lint rules forbid ref-in-render).
- Review (RDD on): assess over 017323e..db979cf → medium, slice_budget_reached (3,243 lines incl. lockfile). User granted consent. Lens: review-reliability. Outcome: **approved**, acknowledged, authority burned (lineage review-fcb38c612e23123c). Reviewed boundary is now `db979cf`. 7 advisory findings: 6 fixed in T3b; `R3-no-behavior-tests` deferred as follow-up because it needs a test runner (OD-11, SCF-08).
- Parent visual check of specimen (1440/390, night/day): direction reads correctly; noted Pagination sets words in mono (fix in T3b); native date input shows browser-locale format (acceptable).

- 2026-09-26: T3b–T6 done by delegated writer #2 (sonnet): lint clean + build pass per task; 6-shot pass with overflow fixes at 820. Accepted deviation: permission matrix follows §4 (personnel/licenses/blocks = Admin+Supervisor; medical write, users, settings, backups = Admin only). Non-resolve actions fire demo toasts.
- T7 inspection round 1 (parent, 6 base shots + 18 state/interaction shots): mechanics verified (dialog gating, live recompute 4→3 alerts, aria-live announcement, role gating, 404, drawer). 11 defects batched into round-1 fixes: mono punctuation spacing on inline IDs/timestamps; actions not right-aligned (contract); rating status replaced by detained marker (hides Vencida); empty Número columns; loading lamp shows a check; focus not moved to linked row; phone stack overlap/overflow; Consulta sees HISTORIAL (audit is Admin+Supervisor); all audit times 00:00; tablet rail group label clipped; phone avatar/actions/audit-line layout.

- T7 round-1 fixes by delegated writer #3 (sonnet): f7f8fe2, e0589f7, 5691b99 (lint + build pass per commit; shot.cjs 6/6 ok, states.cjs 18/18 ok; sweep focus now lands on the linked row). The writer added `Co-Authored-By` trailers against the project rule; with user authorization the 3 unpushed commits were rewritten message-only (tree 84bcbe9 identical before/after).
- T7 round-2 (parent confirm): 9/11 confirmed fixed in screenshots; audit line centered (button default text-align) and phone actions not stretched — fixed inline, 6/6 shots ok. Inspection budget (2 rounds) spent; remaining polish goes through the finish reviewer.

- RDD slice db979cf..HEAD (4,958 lines) stopped with `lens_context_budget_exceeded` (no authority created). User chose split review in detached worktrees (`../sryg-frontend-worktrees/`, removed after): tramo 1 db979cf..2387fed, tramo 2 ..82761d6, tramo 3 ..6c7802c, tramo 4 6c7802c..86a9957 — all consent granted, lens review-reliability, **approved**, acknowledged, authority burned. Reviewed boundary is now `86a9957`; 68545a0 (provenance bytes) and f786402 (CSS wrap fix) are the next, unreviewed slice.
- Impeccable detect: static scan 0; rendered scan (IMPECCABLE_BROWSER = Playwright chromium-1243) flagged 11px labels, cédula overflow, dialog hairline + wide shadow → fixed. Remaining all-caps-body (ECAM message titles) and repeating-stripes (Bloqueada hatch) are intentional per the direction contract.
- Review advisory fixes applied: f9434e9, 6ea8ee7, f5b0bed, 29be76a (14 items: label 12px, dialog shadow, matchMedia guard, shared demo id, h23 clock, stable focus trap, ?pagina validation incl. role, restartable sweep, due-today copy, single open-block rule, cédula overflow, catalog live tokens + labelled controls + radio group). 2bd5f1d condensed 27 multi-line comments (comment-only diff verified). f786402 lets long names wrap (tested with injected long name at 390/820/1440: no overflow). Tramo-4 advisories: sweep overlay persistence = false positive (animation ends at opacity 0, forwards); ramp swatch theme race = harmless (ramp identical in both themes).
- 68545a0 embedded provenance (origin line) in the brand mark JPGs; `embed-prompt --scan` → 0 missing.
- Finish review (impeccable-finish-reviewer, fresh agent, code-led): **ship**, no material fixes. Keep note: contextual primary action — never force "Emitir o renovar" primary while issuance is blocked.

- DESIGN.md + .impeccable/design.json written by impeccable-documenter from the shipped build (201 lines; named rules: One Ramp, Hue-Is-A-Verdict, Mono-Is-For-Columns, No-Shadow). Parent check: JSON valid; lamp hexes, grounds, and 12px label size match tokens.css. T7 closed.
- RDD assess 86a9957..6dad8e6 (68545a0 provenance, f786402 wrap fix, 6dad8e6 docs): medium, 350 lines, `review_due: false` (`under_budget`). Stays pending in the next slice; reviewed boundary remains `86a9957`.

## Follow-ups (outside this feature)

- Behavior tests — blocked on OD-11 test runner. Named by reviews: worstStatus, deriveWarnings open-block filter (stale bloqueadaPorId → no warning), dueSentence 0/1/−1 days, ?pagina resolution per role, RBAC route gating (403 for supervisor/consulta on admin routes, invalid ?rol fallback), ConfirmDialog reset on reopen, PageKeys keyboard, Toast timers, ThemeProvider resolution.
- Wire real flows for Emitir/renovar, Registrar bloqueo, Editar datos, Imprimir credencial (currently demo toasts).

## Next step

Merged locally into `main` by fast-forward (017323e..ebc8e72, 23 commits) at the user's request on 2026-09-27; lint and build pass on `main`. No remote exists, so no push or pull request was made. Slice 86a9957..ebc8e72 remains under the RDD budget and is reviewed with the next slice.
