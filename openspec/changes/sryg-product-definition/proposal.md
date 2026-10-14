# Proposal: SRYG Product Definition Baseline

## Intent

SRYG (Automated Credential Management System for INAC Maracay) is greenfield: the only source of truth is an engineering thesis (`docs/thesis.docx`) whose requirements are scattered, partly inconsistent (credential state names), and silent on key numbers (RAV 60 / RAV 67 validity periods, alert threshold). Starting implementation directly from the thesis would force every later change to re-derive scope, re-litigate the stack, and guess at undecided rules.

This change establishes a single, reviewable product baseline before any code exists: consolidated definitions, resolved and open decisions with owners, an ordered roadmap of implementation changes, and a screen-by-screen design brief to seed the design system. Success means every later change (`sryg-project-scaffold` onward) can start from these documents without reopening the thesis for scope questions.

## Scope

### In Scope
- `docs/sryg-definitions-and-tasks.md` — master document: product summary, actors/roles, domain entities, business rules (with RAV 60 / RAV 67 / ICAO Annex 1 references), NFRs, resolved decisions, open decisions with owners, and the ordered roadmap below with a task checklist per change.
- `docs/design-brief-runbook.md` — runbook of every view/screen, its options/actions, and role access (Administrador / Supervisor / Consulta), used as the initial brief for `sryg-design-system`.
- Minimal update to `openspec/config.yaml` `context` to record the resolved stack (done in this phase; see Affected Areas).
- A baseline spec capturing the product vocabulary and roadmap contract (see Capabilities).

Both documents are produced by a separate writer from the same inputs (`exploration.md` + user decisions); this proposal references them as the change deliverables.

### Out of Scope
- Any application code, scaffolding, dependencies, or git initialization (belongs to `sryg-project-scaffold`).
- Clinical medical data, diagnoses, or medical histories — the system stores administrative results only (thesis 606–613; RAV 67).
- Other INAC areas: finance, materiel, HR hiring, training not tied to license issuance/renewal (thesis 649–658).
- Other INAC offices — Maracay regional office only for initial delivery (thesis 375–382).
- Resolving INAC-owned open decisions (validity periods, block-lift authority, report catalog); this change records them, it does not decide them.

## Capabilities

### New Capabilities
- `product-baseline`: product vocabulary and contract shared by all later changes — roles (Administrador, Supervisor, Consulta), core entities (PersonalAeronautico, Licencia, Habilitacion, CertificadoMedico, Usuario, Auditoria), credential-status vocabulary (pending canonical name), scope boundaries, the ordered roadmap with dependencies, and the register of open decisions with owner and blocked change.

### Modified Capabilities
- None (no existing specs under `openspec/specs/`).

## Approach

1. Consolidate `exploration.md` (thesis inventory with line cites) plus the user's stack decisions into the master document; keep thesis line references so every definition is traceable.
2. Every functional rule in the documents cites its regulatory basis (RAV 60 for licenses/ratings, RAV 67 for medical certificates, ICAO Annex 1 for international standards). Where the thesis gives no numeric value, the documents state "pending — source: RAV text / INAC" instead of inventing one.
3. Record conflicts explicitly rather than silently choosing (e.g., state names: vigente / próxima a vencer / vencida / bloqueada vs Activa / Vencida / Suspendida vs Activa / Vencida / Bloqueada).
4. Derive the design-brief runbook from the explicit screens (thesis 1189–1191) plus inferred ones (login, expediente, dashboard/alerts, block resolution, audit viewer, user admin), each with actions and role access marked "proposed" until the permission matrix is confirmed.
5. Both documents and this proposal share one roadmap (below), with identical change names and dependencies.

### Roadmap (shared, authoritative order)

| # | Change | Summary | Depends on | Regulatory basis |
|---|--------|---------|-----------|------------------|
| 1 | `sryg-project-scaffold` | git init; monorepo `apps/web` (React+Vite), `apps/api` (NestJS), `packages/db` (Drizzle schema + migrations), shared types; PostgreSQL via docker compose; lint/format; test runner; CI | — | n/a (technical) |
| 2 | `sryg-design-system` | Tokens, base components, app shell, built from the design-brief runbook | 1 | n/a (technical) |
| 3 | `sryg-auth-rbac` | Users, Administrador/Supervisor/Consulta, JWT, guards, audit write path, user admin | 1 | Thesis security requirements (ISO/IEC 27001-aligned); no RAV basis |
| 4 | `sryg-personnel-registry` | PersonalAeronautico CRUD + expediente | 3 (UI on 2) | RAV 60 personnel categories; ICAO Annex 1 |
| 5 | `sryg-licenses-ratings` | Licencia + Habilitacion, RAV 60 rules, state machine | 4 | RAV 60; ICAO Annex 1 |
| 6 | `sryg-medical-certificates` | CertificadoMedico classes 1/2/3, no clinical data | 4 (parallel with 5) | RAV 67; ICAO Annex 1 |
| 7 | `sryg-status-validation-blocking` | Coherence check, block on issue/renewal, block lift | 5, 6 | RAV 60; RAV 67 |
| 8 | `sryg-alerts-dashboard` | Expiry alerts, threshold, dashboard | 5, 6 | RAV 60; RAV 67 |
| 9 | `sryg-reports-audit` | Directive reports, audit viewer/export | 3–6 | RAV 60; RAV 67 (compliance reporting) |
| 10 | `sryg-credential-output` | Printable credential (PDF and/or QR, pending decision) | 7 | RAV 60 |
| 11 | `sryg-backups-ops` | Backup/restore scripts, Render deployment | 1 (parallel) | n/a (technical) |

## Decisions

### Resolved (user, 2026-09-26)
- Frontend: React + Vite. Backend: NestJS. ORM: Drizzle. Database: PostgreSQL. Language: TypeScript end to end.
- Initial delivery covers the Maracay regional office only (thesis 375–382).
- Medical data limited to administrative fields (thesis 606–613).

### Open (exploration §10, items 4–16)

| # | Decision | Owner | Blocks |
|---|----------|-------|--------|
| 4 | Migration tool (drizzle-kit expected) | User (confirm in design) | `sryg-project-scaffold` |
| 5 | Hosting topology — decided: Render | User | `sryg-backups-ops` |
| 6 | Photo storage (DB / filesystem / object storage) | User | `sryg-personnel-registry` |
| 7 | Alert notification channel (in-app / email / SMS) | INAC | `sryg-alerts-dashboard` |
| 8 | Near-expiry threshold (days) | INAC | `sryg-alerts-dashboard` (mitigable with a configurable default) |
| 9 | Numeric validity periods per license category, rating, medical class | INAC (from official RAV 60 / RAV 67 texts) | `sryg-licenses-ratings`, `sryg-medical-certificates` (mitigable if modeled as configurable data) |
| 10 | Canonical blocked-state name (Bloqueada vs Suspendida) and full state set | INAC + User | `sryg-licenses-ratings`, `sryg-status-validation-blocking` |
| 11 | Role that can lift a block ("autoridad competente") | INAC | `sryg-status-validation-blocking` |
| 12 | Credential output: PDF, QR-authenticated, or both | INAC + User | `sryg-credential-output` |
| 13 | Report catalog (types, fields, filters, export formats) | INAC (directive) | `sryg-reports-audit` |
| 14 | Test runner | User | `sryg-project-scaffold` |
| 15 | Password/account policy (complexity, lockout, rotation) | INAC + User | `sryg-auth-rbac` |
| 16 | Multi-office scope beyond Maracay | INAC | None for initial delivery (single office confirmed); revisit before data-model freeze in `sryg-personnel-registry` |

No open decision blocks this change: they are recorded, not resolved.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/sryg-definitions-and-tasks.md` | New | Master definitions, decisions, roadmap with task checklists |
| `docs/design-brief-runbook.md` | New | Screen/action/role runbook for the design system |
| `openspec/config.yaml` | Modified | `context` now records the resolved stack instead of "frontend framework is not yet chosen" |
| `openspec/changes/sryg-product-definition/` | New | Proposal and later spec/design/tasks artifacts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| RAV 60 / RAV 67 / ICAO Annex 1 numeric validity periods are absent from the thesis | High | Mark as pending with INAC as owner; recommend modeling periods as configurable data so changes 5/6 are not hard-blocked; never invent values |
| Credential state names are inconsistent across the thesis (vigente/bloqueada vs Activa/Vencida/Suspendida vs Bloqueada) | High | Document all variants with line cites; require decision #10 before `sryg-licenses-ratings` design |
| No permission-per-module matrix; mapping of the 9 real users (Taquilla, Supervisores, Inspectores) to roles is inferred | High | Runbook marks role access as "proposed"; INAC confirmation required before `sryg-auth-rbac` guards are finalized |
| No concrete report catalog | Medium | Record known report intents only (near-expiry/expired personnel, consolidated status, compliance); decision #13 gates `sryg-reports-audit` |
| Parallel writer drift: docs and proposal diverge on roadmap names/dependencies | Medium | Roadmap table above is authoritative; verify phase checks name/dependency equality across all three files |
| Documentation volume may exceed the 400-line review budget | Medium | Passive docs-only content; delivery strategy `ask-on-risk` applies at tasks phase |

## Rollback Plan

Docs-only change with no runtime effect. Rollback: delete `docs/sryg-definitions-and-tasks.md` and `docs/design-brief-runbook.md`, restore the previous `openspec/config.yaml` `context` text ("Frontend framework is not yet chosen."), and remove `openspec/changes/sryg-product-definition/`. Note: the project is not yet a git repository (git init belongs to `sryg-project-scaffold`), so rollback is manual file removal until version control exists; once it does, a single revert suffices.

## Dependencies

- `openspec/changes/sryg-product-definition/exploration.md` and the source thesis `docs/thesis.docx`.
- User stack decisions of 2026-09-26.
- INAC input for decisions 5, 7–13, 15, 16 (needed by later changes, not by this one).

## Success Criteria

- [ ] `docs/sryg-definitions-and-tasks.md` exists and covers roles, entities, business rules, NFRs, resolved decisions, all open decisions 4–16 with owner and blocked change, and the 11-change roadmap with a task checklist per change.
- [ ] `docs/design-brief-runbook.md` lists every explicit and inferred screen with its actions and role access for Administrador, Supervisor, and Consulta.
- [ ] Roadmap change names and dependencies are identical across this proposal and both documents.
- [ ] Every functional rule in the documents cites RAV 60, RAV 67, or ICAO Annex 1 (or is marked technical/non-regulatory); no regulation number or numeric validity period is invented.
- [ ] Out-of-scope boundaries (no app code, no clinical data, no other INAC areas, no other offices) are stated in the master document.
- [ ] `openspec/config.yaml` no longer states that the frontend framework is undecided.
