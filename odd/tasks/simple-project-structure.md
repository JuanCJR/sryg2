# Simple project structure

Objective: replace the hexagonal/clean layout (api) and the features/atomic layout (web) with a conventional structure readable without that background. Pure reorganization, no behavior change.
Branch: `refactor/simple-project-structure` · Delivery: ask-on-risk (expected split: one PR for api, one for web) · Test runner: vitest (`pnpm test`), plus `pnpm lint` and `pnpm typecheck`.

## Specs

- **S1 (api layout)** — "En el backedn pasaremos a la tipica estructura de module / controllers / services / dtos". Decision (user, 2026-10-15): "Carpeta repositories" — each module becomes `<module>/{controllers,services,dtos,repositories}` + `<module>.module.ts`. Drizzle stores/readers move to `repositories/` as concrete classes; port interfaces are removed. Domain rules and entities move into `services/` (a module-root `<module>.types.ts` is allowed for shared types). Use cases become services (`*.service.ts`).
- **S2 (api shared code)** — `shared/`, `infrastructure/`, `config/` cross-cutting code moves to `src/common/` using the same folder vocabulary (guards, filters, pipes, decorators, database, errors). The hexagonal ESLint boundary is removed.
- **S3 (web pages)** — "en el frontend tendremos todos los pages en un directorio de pages". Each feature becomes `src/pages/<feature>/` with its page components at its root.
- **S4 (web common)** — "tendremos un directorio de hooks, components otros a nivel de common". Decision (user, 2026-10-15): "Aplanar todo" — `design-system` goes to `src/common/components` without atomic levels; tokens/theme go to `src/common/styles`; shell, templates and role/session code go to `common/`.
- **S5 (web page-local)** — "y tambien tendremos estos mismos elementos a nivel del pages especifico sino es algo que se comparta". Per page: `components/` (containers merged in), `hooks/`, `services/` (former `data/`), `utils/` (former `domain/`). Code used by more than one page goes to `common/`.
- **S6 (no regressions)** — behavior, routes, HTTP contracts and tests are unchanged; `pnpm lint`, `pnpm typecheck`, `pnpm test` stay green. ESLint rules are rewritten for the new layout; docs describing the old layout are updated.

## Tasks

| ID | Specs | Route | Status | Commit |
|----|-------|-------|--------|--------|
| T1 | S1, S2, S6 | delegated (parallel writer, apps/api + root eslint) | done | 1049ef6 — typecheck 0, lint clean, 279/281 tests (2 fail identically on base c0f83b4) |
| T2 | S3, S4, S5, S6 | delegated (parallel writer, apps/web) | done | 3aa4161 — 33 files / 240 tests, lint 0, typecheck ok, build ok |
| T3 | S6 | inline (docs referencing old layout) | done | see Log L5 |
| T4 | S6 | inline (seam check: full lint/typecheck/test) | done | see Log L6 |

## Log

- **L1** (2026-10-15, user, verbatim): "# Contexto — Debemos migrar la organizacion del proyecto para mejorar su lectura ya que actualmente una persona sin conoximiento de clean architecture y hexagonal architecture le costaria mucho entenderlo ya que no ha pasado por esa curva de aprendizaje. # Consideraciones 1. En el backedn pasaremos a la tipica estructura de module controllers services dtos 2. en el frontend tendremos todos los pages en un directorio de pages, tendremos un directorio de hooks, components otros a nivel de common y tambien tendremos estos mismos elementos a nivel del pages especifico sino es algo que se comparta"
- **L2** (2026-10-15): user chose "Carpeta repositories (Recomendado)" for api data access and "Aplanar todo (Recomendado)" for web.
- **L3**: route — T1 and T2 run as two parallel writers (writer trigger (a): independent, disjoint surfaces `apps/api/**`+`eslint.config.js` vs `apps/web/**`, each heavy). Parent owns git. Base commit c0f83b4.
- **L4**: T1 judgement calls — use cases renamed `XService`; per-module clocks merged into `common/clock.ts`; unit of work → `common/database/transaction-runner.ts`; symbol port tokens → class tokens; `src/test/fakes.ts` lets in-memory fakes stand in for concrete classes. T2 — `src/expediente-registry.ts` at src root (imports slots from 7 pages); Forbidden/NotFound pages in `common/components`; duplicate `clsx` removed.
- **L5**: T3 updated `openspec/config.yaml`, `docs/sryg-definitions-and-tasks.md` §9, `docs/design-brief-runbook.md`. Historical records (`openspec/changes/*`, `docs/plan-ejecucion-paralela.md`) intentionally left unchanged.
- **L6**: T4 — `pnpm lint` exit 0, `pnpm typecheck` exit 0. Tests: api 279/281 (known base failures: `reports.int.test.ts` export without ORDER BY, `credentials-core.int.test.ts` placeholder vs local DB data); web flaky 1–2/240 per run (timeouts/findBy), reproduced at the same rate on base c0f83b4 (3 runs base: 2,1,1 failures; branch: 2,2). Pre-existing, not caused by this change.
- **L7**: verifier (independent): S1–S6 PASS, no blockers — 69 routes identical base vs HEAD, 72 test files with equal it/expect counts, bodies unchanged beyond imports/renames. Advisories fixed: web page-boundary rule now derives PAGE_NAMES from src/pages (drops stale 'errors') and covers ../ up to ../../../../ imports; probes: deep sibling import flagged, common->pages flagged, allowed import clean.
- **L8** (2026-10-15): native review stopped with lens_context_budget_exceeded (1239 files); user chose single PR with size:exception. Pushed and opened https://github.com/JuanCJR/sryg2/pull/21 (~5.2k changed lines, 562/677 pure renames).
