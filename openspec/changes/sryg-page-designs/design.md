# Design: SRYG page designs (15 pages over 6 templates, mock data)

## Technical Approach

**Templates are presentational layout components with typed slot props. Features own data, state, and permissions. Templates own structure, state frames, and ARIA wiring.** Every page follows one render path: route, then an optional `RequirePermission` gate, then a thin page, then a container, then a template filled with feature components.

The change keeps the existing architecture and adds three things:

1. **Five template components** in `src/app/templates/`, plus a shared state-frame module. Each one has a discriminated-union prop type keyed on `status`, so a page cannot render "ready" content without its data or forget its loading and error frames.
2. **A demo-data kernel** in `src/demo/` (clock, seeded helpers, shared roster, `useDemoResource`). Containers get data through a `Resource<T>` shape. That shape is the backend seam: a future query hook returns the same shape, and components and templates do not change.
3. **A path registry** in `src/app/routes.ts`. `App.tsx`, the nav, the templates, and the features take their paths from it, so the Q5 home-route decision is a one-constant change.

Visual direction is out of scope for this document. For List, Form, Dashboard, and Auth, this design fixes only the **minimum slot contract**: the semantic regions and states every structure must provide. The structure the user picks at each Impeccable gate may add slots. It may not remove state coverage.

This maps to the proposal's approach in order: templates first (§ Template contracts), Expediente migration (§ Expediente migration), mock data (§ Demo-data kernel), progress tracking (§ Progress tracking), and slices (§ Migration / Rollout).

## Architecture Decisions

### Decision: Templates are slot-based, status-discriminated, and permission-blind

**Choice**: Each template is a function component whose props are a discriminated union on `status`: `loading`, `error`, `ready`, plus `empty` for List and Dashboard and `blocked` or `submitting` for Form. Content arrives as `ReactNode` slots. Templates never call `useRole`, never read data modules, and never read the URL.
**Alternatives considered**: (a) Render-prop or compound-component templates (`<ListPageTemplate.Toolbar>`). (b) Templates that fetch their own data from a passed loader. (c) A single generic `PageTemplate` with a `variant` prop.
**Rationale**: Discriminated unions let `tsc -b` (the only checker available, since no test runner exists) enforce that every page handles every state. Slots match how `ExpedienteContainer` already composes `IdentityHeader`, `WarningStack`, and panels. Compound components complicate the `react-refresh/only-export-components` rule and hide the contract. A loader-owning template would put the backend seam inside `src/app/` instead of inside each feature. A single generic template recreates the fragmentation the inventory warns against.

### Decision: Templates own layout mechanics that siblings must not reinvent

**Choice**: Templates own sticky positioning, full-bleed banner rows, responsive breakpoints (phone ≤480, tablet 481–1024, desktop ≥1025), the `--measured-stack-height` measurement, tab-to-panel ARIA wiring, live regions, and the loading, error, and empty frames. Features own copy, domain derivations, URL parameters, focus targets inside their own content, and dialogs, which they pass through an `overlays` slot.
**Alternatives considered**: Leave the sticky and responsive CSS in each container, as the Expediente does today.
**Rationale**: These mechanics are exactly what makes siblings drift, for example the tablet bottom key bar or the phone sticky offset under the warning stack. The container keeps everything that depends on its data.

### Decision: Shell layout values become inherited custom properties

**Choice**: In S01, `AppShell.module.css` declares `--shell-top-offset: 36px` on `.layout` and `--shell-main-pad` on `.main` (`var(--s-6)`, and `var(--s-5)` at ≤480px). Template CSS reads `var(--shell-top-offset, 0px)` and `calc(var(--shell-main-pad, 0px) * -1)` instead of the literals `36px` and `calc(var(--s-6) * -1)` that `ExpedienteContainer.module.css` hardcodes today.
**Alternatives considered**: (a) Keep the literals in every template. (b) Add tokens to `tokens.css`.
**Rationale**: The resolved values are identical, so pixel parity holds, and five templates stop duplicating shell geometry. They are layout variables, not design tokens, so `DESIGN.md` does not change. The `0px` fallbacks make templates render correctly outside the shell, which Login needs.

### Decision: AuthTemplate has two placements, and ErrorTemplate reuses the in-shell placement

**Choice**: `AuthTemplate` takes `placement: 'standalone' | 'inShell'`. `standalone` renders a full-viewport frame for Login outside `AppShell`: brand, the `DATOS DE DEMOSTRACIÓN` tag, the day/night key, and the panel. `inShell` renders only the panel. In S08, `ErrorTemplate` becomes a thin wrapper that renders `AuthTemplate placement="inShell"`. Its props (`code`, `title`, `explanation`) and its `role="alert"` stay unchanged, so `RequirePermission`, the `*` route, and the Expediente's person-not-found path need no edits.
**Alternatives considered**: (a) A separate `ErrorTemplate` layout that copies the Auth styles. (b) Rendering 403 and 404 outside the shell.
**Rationale**: The inventory says ErrorTemplate "reuses its structure". Sharing one panel component makes that literal. 403 and 404 must stay inside the shell so navigation remains available.

### Decision: `src/app/routes.ts` is the single path registry and never imports features

**Choice**: A new `src/app/routes.ts` exports `PATHS`, path builders such as `personnelDetail(id)`, and `HOME = { path, label }`. It imports only from `src/demo/`. `DEMO_PERSON_ID` moves to `src/demo/roster.ts`, and `features/personnel/data/demoData.ts` re-exports it so existing imports keep working. `ErrorTemplate` stops importing `features/personnel/data` and reads `HOME` instead.
**Alternatives considered**: (a) Keep path strings inline. (b) A data-driven route config array that generates both the route table and the nav.
**Rationale**: Today `ErrorTemplate` (in `app/`) imports a feature's data module. That breaks layering and would couple the backend swap to a template. If `routes.ts` imported from a feature, it would create an import cycle, because features import `routes.ts` for their links. Q5 (`/` redirects to `/panel`) becomes a change to `HOME` alone; the ErrorTemplate button label follows `HOME.label`. A data-driven route table was rejected because the JSX table in `App.tsx` is the existing, readable pattern and only 16 routes exist.

### Decision: Demo-data kernel in `src/demo/`, with `Resource<T>` as the backend seam

**Choice**: New `src/demo/` module:

| File | Purpose |
|---|---|
| `clock.ts` | `useDemoToday()`: one `Date` per mount. `?hoy=YYYY-MM-DD` pins it; without the parameter it is the current date. |
| `seed.ts` | `addDays`, `officeHourMinute`, and a seeded PRNG (`mulberry32`) for generated rows. No `Math.random`. |
| `roster.ts` | Canonical synthetic people: `id`, `cedula`, `nombre`, `categoria`, `scenario`. `DEMO_PERSON_ID = 'demo-017'`. |
| `useDemoStateOverride.ts` | Reads `?estado=` and returns a value only if it is in the caller's allow-list. Otherwise returns `null`. |
| `useDemoResource.ts` | `useDemoResource(key, build, options)` returns `Resource<T>` with simulated latency (400 ms, matching the Expediente), forced loading or error, `retry`, and `update`. |

Feature `data/demoData.ts` modules contain pure builders `(today, …) => T` and pure demo mutations `(data, input, now) => T`. Only containers import them.
**Alternatives considered**: (a) Each feature duplicates the person facts it shows. (b) Features import `features/personnel/data` directly. (c) A mock HTTP layer (MSW or fetch stubs).
**Rationale**: (a) lets demo-017's status drift between the Listado, the license form, and the Expediente. (b) creates feature-to-feature imports that the backend swap would have to untangle. (c) is an API client, which is out of scope. With a one-way kernel (`features/*/data` → `src/demo`), `src/demo/` can be deleted once every feature has a real data source. `Resource<T>` is the shape a query library exposes, so the swap replaces one hook call per container.

### Decision: The Expediente keeps its own loader in this change

**Choice**: `ExpedienteContainer` keeps its inline `useEffect` loader. S01 changes only layout composition. New features use `useDemoResource`, which reproduces the same semantics (400 ms latency; `cargando` stays loading; `error`; retry nonce).
**Alternatives considered**: Move the Expediente to `useDemoResource` during S01.
**Rationale**: S01 is a no-regression migration. Changing the data path at the same time doubles what the screenshot comparison has to clear. Adopting the hook later is optional follow-up work.

### Decision: Route-level gates in `App.tsx`, action-level gates in containers, and two stand-in permissions at most

**Choice**: Pages restricted to a role subset are wrapped in `RequirePermission` in `App.tsx`, which already renders a 403 through `ErrorTemplate`. Actions inside pages are gated with `useRole().can()` in containers and passed to components as booleans, as `IdentityHeader` already does. `permissions.ts` gains `blocking:view` (Administrador, Supervisor) for page 8, because viewing the block list is a different right from registering a block. S06 may add `alerts:acknowledge` if runbook §6 restricts acknowledgement. Every addition carries a comment citing the inventory role column and OD-14.
**Alternatives considered**: (a) Gate `/bloqueos` with `blocking:register`. (b) Gate inside each page component.
**Rationale**: Keeping all stand-ins in one matrix preserves Q6's promise that OD-14 rework touches one file. Page-component gating would duplicate the 403 rendering that `RequirePermission` already centralizes.

### Decision: Enforce layer boundaries with ESLint `no-restricted-imports`

**Choice**: `eslint.config.js` gains path-scoped rules:
- `src/app/templates/**` and `src/design-system/**` must not import `src/features/**` or `src/demo/**`.
- `src/features/*/components/**`, `src/features/*/pages/**`, and `src/features/*/domain/**` must not import `**/data/**` or `src/demo/**`.
- `src/features/<a>/**` must not import `src/features/<b>/**`. Use a pattern per feature, or restrict relative imports that climb above the feature root (`../../*/`).

**Alternatives considered**: A convention documented only in prose.
**Rationale**: `npm run lint` is one of the two checks available. A convention with no check erodes over 15 slices. The rules land with the foundations commit, together with the `ErrorTemplate` import fix, so lint passes on the day they are added.

### Decision: Reference-page paths are fixed now, so surface-brief slugs are stable

**Choice**: Each gate runs `impeccable context --target` against a reference page path decided here, before the file exists:

| Template | Reference page file | Brief slug |
|---|---|---|
| List | `src/features/personnel/pages/ListadoPage.tsx` | `src-features-personnel-pages-listadopage-tsx` |
| Form | `src/features/licenses/pages/EmisionLicenciaPage.tsx` | `src-features-licenses-pages-emisionlicenciapage-tsx` |
| Dashboard | `src/features/alerts/pages/PanelPage.tsx` | `src-features-alerts-pages-panelpage-tsx` |
| Auth | `src/features/auth/pages/LoginPage.tsx` | `src-features-auth-pages-loginpage-tsx` |

Each brief lists its template file and, as they are built, every sibling page in `related_targets`, following the Expediente brief's use of that field.
**Alternatives considered**: Target the template file itself.
**Rationale**: Impeccable briefs are per surface, and the reference page is the surface that gets reviewed. Listing the template file and the siblings in `related_targets` lets sibling slices load the inherited direction.

### Decision: Rows in the Listado must open a real Expediente

**Choice**: In S03, `features/personnel/data/demoData.ts` gains `buildExpedienteFor(id, today): ExpedienteData | undefined`. For `demo-017` it returns exactly `buildDemoExpediente(today)`. For other roster people it builds an Expediente from their `scenario`. The container's `id !== DEMO_PERSON_ID` check becomes "the builder returned `undefined`, so render the 404".
**Alternatives considered**: Make only the demo-017 row navigable.
**Rationale**: If every other row led to "Persona no encontrada", the list page would demonstrate the wrong thing. The demo-017 output stays byte-identical. S03 verifies this by comparing `JSON.stringify` of both builders' output for demo-017 and by re-running the S01 capture set for the Expediente.

## Template contracts

### Shared types and frames (S01)

`src/app/templates/templateTypes.ts` and `TemplateFrames.tsx` provide the frames every template reuses. For pixel parity, the error frame's markup is the Expediente's current error markup: `Notice tone="info"` with a secondary "Reintentar" button.

```ts
// src/app/templates/templateTypes.ts
import type { ReactNode } from 'react';

export interface TemplateErrorContent {
  title: string;
  message: ReactNode;
  onRetry?: () => void;
  retryLabel?: string; // default 'Reintentar'
}

export interface TemplateEmptyContent {
  /** 'no-data': nothing exists yet. 'no-results': the current filter matches nothing. */
  reason: 'no-data' | 'no-results';
  title: string;
  message: ReactNode;
  action?: ReactNode;
}
```

### DetailPageTemplate (S01, no gate; direction already committed)

```ts
import type { ReactNode } from 'react';
import type { PageKeyItem } from '../../design-system';

export interface DetailTabs {
  idPrefix: string;
  ariaLabel: string;
  items: PageKeyItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export type DetailPageTemplateProps =
  | {
      status: 'loading';
      /** Sticky banner shown while loading (the Expediente passes <WarningStack loading />). */
      banner?: ReactNode;
      loadingLabel: string;      // visually hidden role="status" text
      headerSkeleton: ReactNode; // feature-shaped skeleton
      tabCount: number;          // number of tab-key skeleton blocks
    }
  | { status: 'error'; error: TemplateErrorContent }
  | {
      status: 'ready';
      breadcrumb?: ReactNode;
      /** Persistent banner, sticky under the top strip on every tab (blocked state lives here). */
      banner?: ReactNode;
      announcement?: string;     // rendered in an aria-live="polite" region
      header: ReactNode;         // owns the page's single <h1>
      tabs: DetailTabs;          // the template renders PageKeys and wires role="tabpanel"
      children: ReactNode;       // the active panel
      overlays?: ReactNode;      // dialogs
    };
```

Invariants:
- The template renders `PageKeys` and derives `panelId` and `tabId` with `getPageKeyDomIds`, so tab-to-panel wiring cannot be done wrong.
- The template measures the banner and sets `--measured-stack-height` on its root only while `status === 'ready'`, as today.
- The template does not render an `<h1>`. The `header` slot owns it: the cédula in `IdentityHeader`.

### ListPageTemplate (S02, gated; minimum contract)

```ts
type ListCommon = {
  title: string;             // the template renders the <h1>
  breadcrumb?: ReactNode;
  summary?: ReactNode;       // count or context line
  primaryAction?: ReactNode; // rendered only if the container's can() allows it
  toolbar?: ReactNode;       // SearchBar and filters
  banner?: ReactNode;
  overlays?: ReactNode;
};

export type ListPageTemplateProps = ListCommon &
  (
    | { status: 'loading'; loadingLabel: string }
    | { status: 'error'; error: TemplateErrorContent }
    | { status: 'empty'; empty: TemplateEmptyContent }
    | { status: 'ready'; children: ReactNode; pagination?: ReactNode }
  );
```

Invariants: `title`, `breadcrumb`, and `toolbar` render in every status except `error`, so the page does not jump and a `no-results` state keeps the filter editable. "Blocked" is a row state (the hatch lamp through `StatusBadge`), not a page state.

### FormPageTemplate and FormSection (S04, gated; minimum contract)

```ts
type FormCommon = {
  title: string;
  breadcrumb?: ReactNode;
  subject?: ReactNode;   // who or what the form acts on (identity strip)
  overlays?: ReactNode;
};

export type FormPageTemplateProps = FormCommon &
  (
    | { status: 'loading'; loadingLabel: string }
    | { status: 'error'; error: TemplateErrorContent }
    | {
        /** First-level state, not an error: the action is impeded (for example an open block). */
        status: 'blocked';
        blocked: { title: string; reason: ReactNode; action?: ReactNode };
        children?: ReactNode; // optional read-only preview
      }
    | {
        status: 'editing' | 'submitting';
        onSubmit: (event: FormEvent<HTMLFormElement>) => void; // import type { FormEvent } from 'react'
        errorSummary?: ReactNode; // focus target after a failed submit
        children: ReactNode;      // FormSection elements
        actions: ReactNode;
      }
  );

export interface FormSectionProps { legend: string; description?: ReactNode; children: ReactNode }
```

Invariants:
- The template renders `<form noValidate>`. While `submitting`, it wraps the sections in `<fieldset disabled>` and sets `aria-busy`.
- `blocked` uses `BLOCKED_STATE_LABEL` from the design system (the DS-05 stand-in for OD-07) and never shows a submit button.
- Q4 fits either answer: one grouped Parámetros page uses one `FormSection` per category, and per-module settings reuse the template on several routes.

### DashboardTemplate (S06, gated; minimum contract)

```ts
export interface DashboardRegion { id: string; title: string; content: ReactNode }

export type DashboardTemplateProps = {
  title: string;
  context?: ReactNode; // role and date line
  banner?: ReactNode;  // alert stack (reuse the WarningStack organism)
  overlays?: ReactNode;
} & (
  | { status: 'loading'; loadingLabel: string }
  | { status: 'error'; error: TemplateErrorContent }
  | { status: 'empty'; empty: TemplateEmptyContent } // "sin alertas"
  | { status: 'ready'; regions: DashboardRegion[] }
);
```

Invariants:
- The container filters `regions` by role. The template never branches on role.
- Region `id`s are stable, so a role switch does not reorder the regions that remain.
- Whatever structure is chosen must respect the `design.json` rule against KPI-card layouts.

### AuthTemplate (S07, gated; minimum contract) and ErrorTemplate (S08)

```ts
export interface AuthTemplateProps {
  placement: 'standalone' | 'inShell';
  leading?: ReactNode;  // for example the error code
  title: string;        // the <h1>
  children?: ReactNode; // explanation text or the form
  actions?: ReactNode;
  footer?: ReactNode;   // demo notice; Q3's "olvidé mi contraseña" link goes here if kept
  live?: 'alert';       // ErrorTemplate passes 'alert' to keep role="alert"
}
```

Invariants:
- `standalone` must show the `DATOS DE DEMOSTRACIÓN` tag and a reachable day/night control (reusing `app/shell/ThemeKeys`), because `TopStrip` is absent outside the shell.
- Q3 fits either answer: drop the link, or add `/ingreso/recuperar` as another `standalone` sibling.

## Expediente migration (S01)

### What moves and what stays

| Current location (`ExpedienteContainer`) | Destination |
|---|---|
| `.page` root, `pageRef`, `stackRef`, the ResizeObserver effect for `--measured-stack-height` | `DetailPageTemplate` |
| `.breadcrumbRow`, `.stackSticky` (sticky, full-bleed), `.liveRegion`, `.pageKeysRow` (desktop row, tablet bottom bar, phone sticky), `.panelWrap` with `role="tabpanel"` | `DetailPageTemplate.module.css` / `.tsx` |
| `PageKeys` rendering and `getPageKeyDomIds` wiring | `DetailPageTemplate`, from the `tabs` prop |
| Loading frame: `.loadingKeys`, `.skeletonKey` | `DetailPageTemplate` loading branch |
| `.skeletonBlock` and the `pulse` keyframes | New `Skeleton` atom (`src/design-system/atoms/Skeleton/`) |
| Identity skeleton (`.loadingIdentity`, avatar, cédula, and line bars) | New `features/personnel/components/ExpedienteHeaderSkeleton.tsx`, passed as `headerSkeleton` |
| Error `Notice` with Reintentar | `TemplateFrames` error frame, through `status: 'error'` |
| Load state machine, `?estado=` and `?pagina=` validation, warnings, highlight and focus effect, `resolveBlock`, role checks, `IdentityHeader`, panels, `ConfirmDialog`, person-not-found 404 | **Stay in the feature** |

Copy, ARIA roles, focus order, and URL behavior (`?pagina=` written with `replace: true`, falling back from `historial` for Consulta) stay unchanged.

### Commits

1. `chore(review): refresh Expediente baseline captures`: only if the fresh baseline differs from the committed PNGs.
2. `feat(templates): add DetailPageTemplate and Skeleton atom`: adds the template, the shared frames, the shell custom properties, and the atom. Nothing uses them yet, so this commit is safe on its own.
3. `refactor(personnel): compose Expediente on DetailPageTemplate`: the migration. It can be reverted alone.

### Regression-check procedure

1. **Baseline from `main`** before any code change. Capture the set below on the same calendar day as the post-migration capture. Dates in the demo data are relative to "today", so the absolute dates in the committed `.impeccable/review/` PNGs differ from any capture taken on another day. Always use the fresh capture as the reference and treat the committed files only as a sanity check.

   | Capture | URL / interaction | Viewport | Theme |
   |---|---|---|---|
   | `desktop`, `desktop-night` | `/personal/demo-017` | 1440 | day, night |
   | `tablet`, `tablet-night` | same | 820 | day, night |
   | `mobile`, `mobile-day` | same | 390 | night, day |
   | `medico-day`, `hab-night`, `bloqueos-night`, `historial-day` | `?pagina=medico\|habilitaciones\|bloqueos\|historial` | 1440 | as named |
   | `sweep-end-night` | select the top warning, wait > 600 ms | 1440 | night |
   | `resolve-dialog-day`, `resolved-night` | Bloqueos → Resolver; then confirm | 1440 | as named |
   | `loading-night`, `error-day`, `sin-alertas-night` | `?estado=cargando\|error\|sin-alertas` | 1440 | as named |
   | `consulta-day` | `?rol=consulta` | 1440 | day |
   | `stack-open-day-390`, `drawer-night-390` | expand the stack; open the drawer | 390 | as named |
   | `404-day-390` | `/personal/desconocido` | 390 | day |

2. **DOM parity.** For ready (each tab), loading, and error, save `document.querySelector('main').outerHTML` with `class` attributes stripped, before and after. Any difference other than element order that CSS cannot affect is a defect.
3. **Behavior parity.** Do a keyboard pass: tab order, arrow keys on the page keys, Enter on a warning row focuses the highlighted row, the live-region text is correct, `?pagina=` uses replace semantics, and Consulta does not see Historial.
4. **Compare the screenshots** one by one. Comparison tooling stays in the session scratchpad and is not committed. Any pixel difference is a defect unless the user accepts it explicitly.
5. Run `npm run lint` and `npm run build`.

## Feature layout and demo-data contract

```
src/features/<feature>/
  domain/types.ts            domain types only, no values
  domain/*.ts                pure derivations (status, format, config)
  data/demoData.ts           DEMO_* constants, builders (today, …) => T, demo mutations
  containers/<X>Container.tsx   the ONLY importer of data/ and src/demo/
  components/*.tsx           presentational, props only
  pages/<X>Page.tsx          thin route entry: renders the container
```

| Rule | Enforced by |
|---|---|
| Builders are pure and deterministic given `today` and fixed seeds. No `Math.random`, no `Date.now()` inside builders. | Review; `src/demo/seed.ts` helpers |
| "Today" comes from `useDemoToday()`. `?hoy=` pins it for reproducible screenshots. | Review |
| A person's status is identical on every page that shows it, because every page derives it from `src/demo/roster.ts` scenarios (or, for demo-017, from `buildDemoExpediente`). | Review; S03 check |
| Only containers import `data/` and `src/demo/`. | ESLint `no-restricted-imports` |
| Features do not import other features. Cross-feature navigation goes through `src/app/routes.ts`. | ESLint |
| Demo states are reachable by URL: `?estado=` (per-page allow-list, for example `cargando`, `error`, `vacio`, `bloqueado`) and `?rol=`. Unknown values are ignored. | `useDemoStateOverride` allow-list |

Feature folders: `auth` (1, 14), `alerts` (2), `personnel` (3, 4, 5), `licenses` (6), `medical-certificates` (7), `validation-blocking` (8), `reports` (9), `audit` (10), `users` (11), `settings` (12, 13).

## Data Flow

```
URL /personal/:id?estado=&pagina=&rol=&hoy=
  │
  ▼
App.tsx <Route> ──► RequirePermission ──(denied)──► ErrorTemplate 403
  │ (allowed)
  ▼
pages/XPage.tsx
  │
  ▼
containers/XContainer.tsx
  ├─ useRole().can(...)            action gates ──► boolean props
  ├─ useDemoStateOverride([...])   ?estado= allow-list
  ├─ useDemoResource(key, build) ──► data/demoData.ts ──► src/demo/{roster,seed,clock}
  ├─ domain/* derivations
  ▼
app/templates/XTemplate (status union, frames, layout, ARIA)
  └─ slots ◄── features/x/components/*  ◄── design-system atoms/molecules/organisms
```

**Backend seam.** Replace `useDemoResource(key, build)` with a query hook that returns the same `Resource<T>`, and delete `data/demoData.ts`. Nothing below the container changes.

```ts
// src/demo/useDemoResource.ts
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; retry: () => void }
  | { status: 'ready'; data: T; retry: () => void; update: (fn: (current: T) => T) => void };

export function useDemoResource<T>(
  key: string,          // reloads when this changes (for example `${id}|${override}`)
  build: () => T,       // latest closure, held in a ref (keeps react-hooks lint clean)
  options?: { latencyMs?: number; forceLoading?: boolean; forceError?: boolean },
): Resource<T>;
```

Implementation note: derive `loading` from "the result's key differs from the current key" instead of calling `setState` synchronously inside the effect. This satisfies the React 19 `react-hooks` lint rules that the current container works around.

### Sequence: loading a page

```
User      Router     Container          useDemoResource      demoData
 │ navigate │            │                     │                  │
 │─────────►│ render     │                     │                  │
 │          │───────────►│ useDemoResource(k)  │                  │
 │          │            │────────────────────►│ status=loading   │
 │          │            │◄────────────────────│                  │
 │          │            │ Template status=loading (frame)        │
 │          │            │                     │ after 400ms      │
 │          │            │                     │─── build() ─────►│
 │          │            │                     │◄──── T ──────────│
 │          │            │◄── ready{data} ─────│                  │
 │          │            │ derive + gate ► Template status=ready  │
```

### Sequence: Impeccable choice gate (List, Form, Dashboard, Auth)

```
Orchestrator(interactive)   Impeccable            User            sdd-apply (slice)
   │ context --target <ref>   │                     │                    │
   │─────────────────────────►│ 2–3 questions       │                    │
   │◄─────────────────────────│                     │                    │
   │ relay questions (lossless) ───────────────────►│                    │
   │◄──────────────────────────────── answers ──────│                    │
   │─────────────────────────►│ decision page:      │                    │
   │                          │ 3 structures (dev server)                │
   │ relay complete choice envelope ───────────────►│                    │
   │◄──────────────── pick | steer | re-roll ───────│                    │
   │                          │ write .impeccable/surfaces/<slug>.md     │
   │ commit brief: docs(impeccable): record <template> direction         │
   │ record pick + brief path in tasks.md ─────────────────────────────►│
   │                          │                     │  build template to │
   │                          │                     │  brief + min contract
   │                          │                     │  build reference page
   │                          │ harden + audit (one batch, one confirm)  │
```

Gate rules:
- The executor never picks, defaults, or infers a structure. The template slice stays blocked until the brief is committed.
- Slices that do not depend on the pending template may proceed while a gate waits: foundations, waves on already-chosen templates.
- If the chosen structure needs slots beyond the minimum contract, the brief's "Direction contract" names them, and the template adds them as optional props.
- When a sibling slice starts, add its page path to the reference brief's `related_targets`.

## Routing (`src/app/App.tsx`)

| Path | Page | Gate | Placement | Slice |
|---|---|---|---|---|
| `/ingreso` | 1 Login | none | **outside** `AppShell` | S07 |
| `/` | → `HOME.path` (Q5; default stays `/personal/demo-017`) | none | shell | — |
| `/panel` | 2 Dashboard | none (acknowledge action gated in page) | shell | S06 |
| `/personal` | 3 Listado | none | shell | S03 |
| `/personal/nuevo` | 5 Registro | `personnel:write` | shell | S10 |
| `/personal/:id` | 4 Expediente | none (Consulta read-only in page) | shell | exists |
| `/personal/:id/editar` | 5 Edición | `personnel:write` | shell | S10 |
| `/personal/:id/licencia` | 6 Emisión / renovación | `licenses:issueRenew` | shell | S05 |
| `/personal/:id/certificado-medico` | 7 Certificado médico | `medical:write` | shell | S11 |
| `/bloqueos` | 8 Bloqueos | `blocking:view` (new) | shell | S12 |
| `/reportes` | 9 Reportes | none (Consulta limited in page) | shell | S14 |
| `/auditoria` | 10 Auditoría | `audit:view` | shell | S14 |
| `/usuarios` | 11 Usuarios y roles | `users:admin` | shell | S09 |
| `/parametros` | 12 Parámetros | `settings:admin` | shell | S13 |
| `/respaldos` | 13 Respaldos | `backups:view` | shell; `PendingScreen` until Q1 | S15 |
| `/perfil` | 14 Perfil | none | shell | S08 |
| `*` | 15 404 | none | shell | S08 alignment |

Notes:
- React Router ranks the static segment `nuevo` above `:id`, so `/personal/nuevo` never reaches the Expediente.
- Login is a sibling of the shell layout route, still inside `RoleProvider`, `ToastProvider`, and `ThemeProvider`. Its mock submit calls `navigate(HOME.path, { replace: true })`. No guard redirects the shell to Login, so deep links and screenshots keep working.
- In S07, `RoleMenuContent`'s disabled "Cerrar sesión" becomes a link to `/ingreso`, so Login is reachable from the UI.
- Nav: S12 adds Bloqueos to `nav-items.ts` with `permission: 'blocking:view'`, outside the admin group. Form pages (5, 6, 7) are not nav items; they are reached from the Listado and the Expediente.
- Expediente buttons that are toasts today (Emitir o renovar, Editar datos, Registrar o renovar certificado, Registrar bloqueo) become navigations in the slice that builds their target page. Each such slice re-runs the S01 captures for the affected buttons and their disabled states.
- If Q1 drops page 13: remove the route and the nav item (unknown paths fall to 404), then delete `PendingScreen`. Otherwise S15 deletes it.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/app/templates/templateTypes.ts` | Create (S01) | Shared `TemplateErrorContent` and `TemplateEmptyContent` |
| `src/app/templates/TemplateFrames.tsx` + `.module.css` | Create (S01) | Loading, error, and empty frames reused by every template |
| `src/app/templates/DetailPageTemplate.tsx` + `.module.css` | Create (S01) | Extracted from `ExpedienteContainer` |
| `src/design-system/atoms/Skeleton/Skeleton.tsx` + `.module.css` | Create (S01) | Skeleton block and pulse animation (reduced-motion safe); exported from `index.ts` |
| `src/app/shell/AppShell.module.css` | Modify (S01) | `--shell-top-offset`, `--shell-main-pad` (values unchanged) |
| `src/features/personnel/containers/ExpedienteContainer.tsx` + `.module.css` | Modify (S01) | Composes `DetailPageTemplate`; layout CSS removed |
| `src/features/personnel/components/ExpedienteHeaderSkeleton.tsx` + `.module.css` | Create (S01) | Identity skeleton moved out of the container |
| `src/app/routes.ts` | Create (foundations) | `PATHS`, builders, `HOME` |
| `src/demo/{clock,seed,roster,useDemoStateOverride,useDemoResource}.ts` | Create (foundations) | Demo-data kernel |
| `src/features/personnel/data/demoData.ts` | Modify (foundations, S03) | Re-export `DEMO_PERSON_ID` from the roster; S03 adds `buildExpedienteFor` and list builders |
| `src/app/templates/ErrorTemplate.tsx` | Modify (foundations, S08) | Uses `HOME` instead of importing the feature; S08 composes `AuthTemplate` |
| `eslint.config.js` | Modify (foundations) | `no-restricted-imports` boundaries |
| `src/app/templates/ListPageTemplate.tsx` + css | Create (S02) | After the List gate |
| `src/app/templates/FormPageTemplate.tsx`, `FormSection.tsx` + css | Create (S04) | After the Form gate |
| `src/app/templates/DashboardTemplate.tsx` + css | Create (S06) | After the Dashboard gate |
| `src/app/templates/AuthTemplate.tsx` + css | Create (S07) | After the Auth gate |
| `src/app/App.tsx` | Modify (per page slice) | Replace `PendingScreen` routes; add 1, 5, 6, 7, 8 |
| `src/app/shell/nav-items.ts` | Modify (foundations, S12) | Paths from `routes.ts`; Bloqueos item |
| `src/app/shell/RoleMenuContent.tsx` | Modify (S07) | "Cerrar sesión" links to `/ingreso` |
| `src/app/role/permissions.ts` | Modify (S12, maybe S06) | `blocking:view`; optional `alerts:acknowledge` |
| `src/features/{auth,alerts,licenses,medical-certificates,validation-blocking,reports,audit,users,settings}/` | Create (per slice) | Feature layout above |
| `src/features/personnel/{pages,containers,components}/Listado*`, `Registro*` | Create (S03, S10) | Pages 3 and 5 |
| `src/app/templates/PendingScreen.tsx` + css | Delete (last slice) | Once no route uses it |
| `.impeccable/surfaces/<slug>.md` ×4 | Create (gates) | Chosen direction per new template |
| `.impeccable/review/` | Modify (S01) | Refreshed baseline if it differs; post-migration captures as PR evidence |
| `openspec/changes/sryg-page-designs/pages-inventory.baseline.md` | Create (before the first inventory edit) | Byte-identical copy |
| `/home/jc/projects/sryg/docs/pages-inventory.md` | Modify (outside git) | "Progreso" section |
| `DESIGN.md` | Modify (only if needed) | Only when a slice adds a component or token (the `Skeleton` atom gets one line under Components in S01) |

## Progress tracking

**`tasks.md` is the source of truth. The inventory checklist is a projection that can be regenerated from it.**

- Before the first edit, copy the inventory byte for byte to `openspec/changes/sryg-page-designs/pages-inventory.baseline.md`.
- Insert a `## Progreso` section right after the introduction and before `## Páginas`, in Spanish, as a GitHub task list:

  ```markdown
  ## Progreso

  Fuente de verdad: `sryg-frontend/openspec/changes/sryg-page-designs/tasks.md`. Si esta lista y `tasks.md` difieren, manda `tasks.md`.

  - [ ] 1. Login — AuthTemplate
  - [ ] 2. Dashboard / Alertas — DashboardTemplate
  - [ ] 3. Listado / búsqueda de personal — ListPageTemplate
  - [ ] 4. Expediente del personal — DetailPageTemplate
  …
  - [ ] 13. Estado de respaldos — DashboardTemplate (condicional, Q1)
  - [ ] 14. Perfil / cambio de contraseña — FormPageTemplate
  - [ ] 15. Error / 403 / 404 — ErrorTemplate
  ```

- All 15 items start unchecked, including 4 and 15. An item is checked only after its slice is committed with its route, mock data, runbook §6 states, and passing lint and build. Page 4 is checked after S01; page 15 after S08.
- Each page's task in `tasks.md` ends with an "inventory synced" subtask. The checkbox in the inventory flips in the same session as the task in `tasks.md`.

## Interfaces / Contracts

```ts
// src/app/routes.ts (imports only from src/demo)
import { DEMO_PERSON_ID } from '../demo/roster';

export const PATHS = {
  login: '/ingreso',
  panel: '/panel',
  personnel: '/personal',
  personnelNew: '/personal/nuevo',
  blocks: '/bloqueos',
  reports: '/reportes',
  audit: '/auditoria',
  users: '/usuarios',
  settings: '/parametros',
  backups: '/respaldos',
  profile: '/perfil',
} as const;

export const personnelDetail = (id: string) => `/personal/${id}`;
export const personnelEdit = (id: string) => `/personal/${id}/editar`;
export const licenseForm = (id: string) => `/personal/${id}/licencia`;
export const medicalForm = (id: string) => `/personal/${id}/certificado-medico`;

/** Q5: flip to { path: PATHS.panel, label: 'Volver al panel' } once decided. */
export const HOME = { path: personnelDetail(DEMO_PERSON_ID), label: 'Volver al expediente de demostración' } as const;
```

```ts
// src/demo/roster.ts
export type DemoScenario = 'activa' | 'proxima' | 'vencida' | 'bloqueada';
export interface DemoPersonSeed { id: string; cedula: string; nombre: string; categoria: string; scenario: DemoScenario }
export const DEMO_PERSON_ID = 'demo-017';
export const DEMO_ROSTER: readonly DemoPersonSeed[]; // demo-017 matches buildDemoExpediente (scenario 'bloqueada')

// src/demo/useDemoStateOverride.ts
export function useDemoStateOverride<K extends string>(allowed: readonly K[]): K | null;
```

## Testing Strategy

No test runner is configured and `strict_tdd` is false. This change does not add test infrastructure.

| Layer | What to Test | Approach |
|---|---|---|
| Static | Types, status-union exhaustiveness, layer boundaries | `npm run build` (`tsc -b`) and `npm run lint` (including the new `no-restricted-imports`) on every slice |
| Visual regression | Expediente after S01, and again whenever a later slice touches it (S03, S05, S10, S11, S12) | Capture matrix above: fresh baseline from `main`, same-day comparison, DOM parity with classes stripped |
| State coverage | Every page's runbook §6 states | Walk `?estado=` values and `?rol=administrador\|supervisor\|consulta` for each page; 403 through a denied role on gated routes |
| Design quality | Every page | `impeccable harden` + `impeccable audit`: one batch of fixes, one confirmation round, no open P0 |
| Data consistency | demo-017 identical across pages | S03: `JSON.stringify(buildExpedienteFor('demo-017', d)) === JSON.stringify(buildDemoExpediente(d))`, checked in the dev console |
| E2E | — | Not available; manual keyboard pass per page |

## Threat Matrix

The change adds client-side SPA routes only. It introduces no shell commands, subprocesses, VCS or PR automation, or executable-file classification.

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A: no file classification or execution | — | — |
| Git repository selection | N/A: no git automation in product code | — | — |
| Commit state | N/A: commits are made by the workflow, not the app | — | — |
| Push state | N/A | — | — |
| PR commands | N/A | — | — |

Related client-side input handling, which is not a matrix row: URL parameters (`:id`, `?estado=`, `?pagina=`, `?rol=`, `?hoy=`) are untrusted. Each is checked against an allow-list or parsed strictly. Unknown values fall back to defaults, and an unknown `:id` renders the 404 frame. This follows the existing `?pagina=` validation in `ExpedienteContainer`.

## Migration / Rollout

No data migration is needed. Rollout follows the proposal's auto-chain slices at the 400-line budget. Design-level sequencing:

1. **S01**: shared frames, `DetailPageTemplate`, `Skeleton`, shell custom properties, then the Expediente migration (separate commit).
2. **Foundations** (recommended as its own small slice, about 150 lines, with no gate so it can run while the List gate waits): `src/demo/`, `src/app/routes.ts`, the `ErrorTemplate` import fix, ESLint boundaries.
3. **S02–S07**: one gate per new template, then its reference page.
4. **S08–S15**: waves on templates that already have a direction; S15 depends on Q1; `PendingScreen` is deleted in the last slice.

Revert order follows the proposal's rollback plan. Reverting the foundations slice also requires reverting every later slice, because they import `src/demo/` and `routes.ts`.

## Open Questions

Proposal questions stay open. The design absorbs each answer cheaply:

- [ ] **Q1** Respaldos (13): the route stays on `PendingScreen` until S15. Dropping the page means removing one route and one nav item.
- [ ] **Q2** Page 16: if it is built, it becomes `/personal/:id/credencial` on an existing template. No design change.
- [ ] **Q3** Forgot password: `AuthTemplate.footer` holds the link. A recovery page is another `standalone` sibling.
- [ ] **Q4** Parámetros grouping: `FormSection` per category, or one route per module. The template works either way.
- [ ] **Q5** `/` → `/panel`: change `HOME` in `routes.ts`.
- [ ] **Q6** Stand-ins: kept in `permissions.ts`, `BLOCKED_STATE_LABEL`, and a threshold constant in each feature's `domain/config.ts`.

Design-level questions:

- [ ] **D1** Does `impeccable context` resolve a brief through `related_targets` for sibling pages? If not, sibling slices pass the reference page as `--target` and name the sibling in their answers.
- [ ] **D2** Is alert acknowledgement (ALR-06) restricted by role? This decides whether S06 adds `alerts:acknowledge`.
- [ ] **D3** `/home/jc/projects/sryg/docs/pages-inventory.md` is outside the repository. `sdd-apply` may need an explicit edit-authority grant for that path, or the orchestrator edits it directly.
