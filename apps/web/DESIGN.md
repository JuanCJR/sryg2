---
name: SRYG
description: Credential-status crew alerting for aeronautical personnel at INAC Maracay.
colors:
  n-0: "#07090b"
  n-1: "#0e1114"
  n-2: "#161a1e"
  n-3: "#22272c"
  n-4: "#343a40"
  n-5: "#4d545b"
  n-6: "#6b737a"
  n-7: "#8e959b"
  n-8: "#b6bbc0"
  n-9: "#dde0e3"
  n-10: "#f5f6f7"
  lamp-red-day: "#d12f24"
  lamp-red-night: "#ff5a4e"
  lamp-red-hatch-day: "#a8241b"
  lamp-red-hatch-night: "#c8372d"
  lamp-amber: "#f2a900"
typography:
  headline:
    fontFamily: "B612, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.45
  title:
    fontFamily: "B612, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
  body:
    fontFamily: "B612, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "B612, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.06em"
  figure:
    fontFamily: "B612 Mono, ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "12.5px"
    fontFeature: "tabular-nums slashed-zero"
rounded:
  r-0: "0"
  r-1: "2px"
spacing:
  s-1: "2px"
  s-2: "4px"
  s-3: "8px"
  s-4: "12px"
  s-5: "16px"
  s-6: "24px"
  s-7: "32px"
  s-8: "48px"
  s-9: "64px"
components:
  button-primary:
    backgroundColor: "{colors.n-10}"
    textColor: "{colors.n-0}"
    rounded: "{rounded.r-1}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.n-5}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "n/a"
    rounded: "{rounded.r-1}"
    padding: "0 16px"
    height: "36px"
  page-key:
    backgroundColor: "transparent"
    rounded: "{rounded.r-0}"
    padding: "0 16px"
    height: "36px"
  page-key-selected:
    backgroundColor: "{colors.n-10}"
    textColor: "{colors.n-0}"
---

# Design System: SRYG

## Overview

**Creative North Star: "ECAM/EICAS Crew Alerting"**

SRYG reads like a cockpit crew-alerting system, not a records app. An open credential problem is a warning message that never leaves the top of the screen, ranked by priority, and each license, rating, or medical certificate is a condition line the crew can inspect. The system refuses the category default it was built against: no sidebar of KPI cards, no tabbed card layout, no colored pills. Density and legibility come before decoration; the interface must read as precise and credible before it reads as friendly, matching INAC's institutional character.

The build is monochrome by discipline: one eleven-step cool-neutral ramp (`--n-0` … `--n-10`) supplies every background, text, border, and control state, in both day and night variants. Hue is reserved entirely for status lamps — nowhere else. There are no shadows outside the one dialog surface, no glow, no gradients except the single repeating 45° hatch that marks a blocked lamp. Corners are square to 2px at most. The one authored motion moment — a linked-row sweep when a warning is selected — is deliberate and singular, not a house transition style.

**Key Characteristics:**
- Single neutral ramp for all surfaces and text; color exists only in status lamps.
- B612 for running text and labels; B612 Mono strictly for column-aligned figures in tables and pagination.
- Square corners (0–2px), hairline 1px rules, no shadows outside the confirm dialog.
- One signature motion: a warning-to-credential sweep highlight, exponential ease-out, reduced-motion safe.
- Status is never color alone: every lamp pairs a fill/outline treatment with an icon and a text label.

## Colors

The palette is a single cool-neutral ramp reused for every role; the only chromatic values in the system are the three status-lamp hues.

### Primary
- **Ramp Extreme** (`--n-0` `#07090b` / `--n-10` `#f5f6f7`): the ramp's two poles double as the inverted "primary" surface — night mode's foreground becomes day mode's inverse-background and vice versa. Used for the primary button, the active nav-rail item, the selected page key, and the pressed annunciator key: the system's only "loud" surface, and it is a neutral, not a hue.

### Neutral
- **Ramp steps `--n-1`…`--n-9`**: `--n-1`/`--n-2` are night background/surface; `--n-9`/`--n-10` and white are day background/surface. `--n-4`–`--n-6` carry rules, borders, and muted text across both modes. One ramp, remapped per `data-theme`, never redefined.

### Status (hue lives only here)
- **Red — Vencida / Bloqueada** (`#d12f24` day, `#ff5a4e` night): not-in-order states. Bloqueada adds a 45° repeating hatch (`#a8241b`/`#c8372d`) over the red fill plus a lock icon — the system's only gradient, reserved for this one state.
- **Amber — Próxima a vencer** (`#f2a900`): attention, not yet a failure. Gets an inset outline in day mode so the fill reads on white.
- **Unlit outline — Activa** (ramp `--n-5` day / `--n-8` night): no fill, an outline lamp with a check icon. "In order" is deliberately the quietest lamp in the set, not a green fill.

### Named Rules
**The One Ramp Rule.** Every background, surface, border, and text color in the system resolves to a step of the single 11-step neutral ramp. A new component that reaches for a color outside `--n-0`…`--n-10` or the three status hues is off-system.

**The Hue-Is-A-Verdict Rule.** Color never decorates. The only chromatic values in the build are the three status lamp colors (red, amber, unlit-neutral), and they appear nowhere except lamps, badges, and the blocked-row hatch — never as a border stripe, background tint, or brand accent.

## Typography

**Body Font:** B612 (with system-ui, sans-serif fallback)
**Label/Mono Font:** B612 Mono (with ui-monospace, SFMono-Regular, Consolas, monospace fallback)

**Character:** A humanist sans built for cockpit legibility, paired with its own monospace for data columns. The pairing reads instrumented and procedural rather than editorial.

### Hierarchy
- **Headline** (700, 40px, desktop / 28px at ≤480px): the cédula, the one identity headline on the Expediente — B612, not mono, because it is running text, not a column figure.
- **Title** (700, 20px): the person's name beneath the cédula headline; dialog titles.
- **Body** (400, 14px, line-height 1.45): default running text; 15px at ≤1024px to keep touch legibility.
- **Label** (700, 12px, 0.06em tracking, uppercase): page keys, nav groups, table column headers, badges, status text, and the annunciator's key labels — the caps-with-tracking treatment used everywhere a short semantic tag appears.
- **Figure** (B612 Mono, 12.5px, tabular-nums + slashed-zero): column-aligned numeric data only — table columns (Número, Emitida, Vence, Restante, Días restantes), pagination, audit-trail rows, and the annunciator's large per-lamp totals. `--fs-xs` (12px) is the accessibility floor; nothing renders smaller.

### Named Rules
**The Mono-Is-For-Columns Rule.** B612 Mono is reserved for figures that sit in an aligned column (table cells, pagination) or a discrete counter (the annunciator's totals). A standalone inline number — the cédula headline, an audit timestamp in running prose, a lone one-character badge detail — stays in B612 with `font-variant-numeric: tabular-nums`, because B612 Mono's punctuation renders a full monospace cell and reads wrong outside a grid or counter.

## Layout

Desktop (1440): a 36px sticky top strip (mark, `SRYG · INAC MARACAY`, a `DATOS DE DEMOSTRACIÓN` tag, local/UTC clock, day/night key) sits above a 232px fixed nav rail and a fluid main column. The main column opens with a breadcrumb, then a full-width sticky warning stack (each row a 44px min-height line), then the identity block, then a horizontally-scrollable row of page keys, then the active panel.

Tablet (481–1024px): the nav rail collapses to 72px icon-only with short labels; the top strip drops the brand subtitle; page keys become an equal-width bottom key bar (52px rows, EFB-style). Table figure columns (Número, Emitida) are dropped to fit width; Estado stays.

Phone (≤480px): the nav rail hides entirely; the top strip collapses to mark + menu button; the identity header stacks to a single column and its action buttons go full-width; tables switch to a stacked phone-row layout instead of a grid.

Spacing rhythm is a 4px base scale (`--s-1` 2px … `--s-9` 64px). Control height is 36px at desktop, 44px at ≤1024px and on any coarse pointer — the touch-target floor for ramp inspectors.

List-style pages (Listado de personal and its `ListPageTemplate` siblings — Bloqueos, Reportes, Auditoría, Usuarios) use a sibling grammar to the Expediente's warning stack: a lookup console rather than a records table with a filter rail. Breadcrumb, then a header row pairing the `<h1>` with a single right-aligned primary action, then a full-width toolbar holding the query field, then a summary region (the annunciator), then the results region. Breadcrumb, title, primary action, and toolbar persist across every status — including `loading` and `error` — so the page never reflows on resolve and a failed load still leaves the query field reachable; the summary region renders in every status except `error`, since there is nothing to summarize when the data failed to load. On tablet the annunciator reflows to a 2×2 grid and the table drops Categoría and Credencial más crítica while keeping Días restantes, the figure the lamp queue sorts on; on phone the query field and annunciator stack to one column and table rows become stacked phone rows.

## Elevation & Depth

Flat by default. Surfaces are separated by hairline 1px rules (`--rule`) and ramp-step contrast (`--surface` vs `--surface-raised`), never by shadow. The one exception is the confirm dialog, which uses a hairline border plus a `::backdrop` scrim and still carries no box-shadow.

### Named Rules
**The No-Shadow Rule.** No `box-shadow` appears anywhere in the system except as a 1px inset outline (lamp rims, focused/highlighted rows) or the dialog backdrop. Depth is conveyed by ramp contrast and rules, not elevation.

## Shapes

Square corners are the default: `--r-0` (0) for page keys, annunciator keys, and lamps, `--r-1` (2px, the system ceiling) for buttons, inputs, tags, and the dialog. Borders are uniformly 1px hairlines in `--rule` or `--control-border`. The only non-solid fill in the system is the repeating 45° hatch used on a Bloqueada lamp and on blocked table rows — reserved for that one state, never decorative.

## Components

### Buttons
- **Shape:** square-cornered, 2px radius (`--r-1`), 36px height (44px at ≤1024px or coarse pointer), `sm` variant shaves 12px off height and drops to `--fs-xs`.
- **Primary:** ramp-inverted fill (`--inverse-bg`/`--inverse-fg`) — the system's only "loud" surface. Contextual, not default: on the Expediente, "Emitir o renovar" is rendered primary only when issuance is actually possible for the current role; on a list page, the single header-row primary action (e.g. "Nuevo personal") renders only when the current role's `can()` allows it, and is omitted rather than disabled or hidden-then-reflowed.
- **Secondary:** transparent fill, `--control-border` outline; hover raises to `--surface-raised`.
- **Ghost:** transparent, no border, used for auxiliary actions (audit link, more-rows).
- **Hover/Focus:** 120ms fast transitions on background/border/color; `:focus-visible` gets a 2px solid outline in `--focus`, offset 2px — no glow.

### Cards / Containers
- **Corner Style:** 2px radius or square.
- **Background:** `--surface` / `--surface-raised` ramp steps only.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px hairline in `--rule`.

### Inputs / Fields
- **Style:** 1px `--control-border` outline, `--surface` background, 2px radius, 36–44px height.
- **Focus:** border color shifts to `--control-border-strong` on hover; invalid state doubles border width to 2px in `--fg` rather than introducing a red field border (red stays reserved for status lamps).
- **Mono variant:** `.mono` modifier switches to B612 Mono with tabular-nums for ID/figure entry fields only.

### Navigation (Nav Rail + Page Keys)
- **Nav Rail:** 232px fixed column of grouped links; active item gets the ramp-inverted fill, same treatment as the primary button. Collapses to a 72px icon-and-shortlabel rail at tablet width, hides entirely at phone width (drawer takes over).
- **Page Keys:** horizontally-scrollable pill-free row of square-cornered, hairline-bordered keys (DATOS, LICENCIAS, HABILITACIONES, MÉDICO, BLOQUEOS, HISTORIAL); the selected key gets the same ramp-inverted fill. A key with an open problem carries a mini lamp. The Expediente auto-opens on the key of its highest-priority warning.

### Warning Stack (signature component)
A sticky, full-width organism above the identity block: up to four 44px message rows (lamp cell leading, uppercase title, detail, right-aligned count), each row a full-width button. Selecting a row jumps to the page key it concerns and triggers the one authored motion moment — a `sweep-in` highlight (600ms, `--ease-out-expo`, clip-path wipe left-to-right, fading to 0 opacity) across every linked credential row in the destination table, respecting `prefers-reduced-motion`.

### List Console (signature component)
The lookup-console grammar for list-style pages, established by Listado de personal and reused by every `ListPageTemplate` page: breadcrumb, a header row pairing the `<h1>` with a single right-aligned primary action, a full-width toolbar, an annunciator summary, and a results region.
- **Query field:** a full-width field, ~56px tall — a deliberate exception to the 36–44px control scale reserved for this one signature surface — with a leading search icon and a trailing `/` key-cap hint (B612 Mono, hairline-bordered) that disappears once the field holds a value or is disabled; a global `/` keyboard shortcut focuses it whenever the user isn't already typing.
- **Annunciator panel:** four equal square-cornered keys in fixed order (Bloqueada, Vencida, Próxima a vencer, Activa), each pairing a lamp, an uppercase caps-tracking label, and a large tabular-mono total. Pressing a key is the page's signature interaction: it filters the results to that state and sorts them by days remaining, most urgent first (the "departure-board raise"); pressing the same key again clears the filter. The pressed key takes the ramp-inverted fill — the system's one active-fill surface, per the existing primary/nav/page-key convention. While the registry is loading, lamps render unlit with an em-dash total in place of the count and the keys are non-interactive, so nothing reflows once data resolves.
- **Idle hint:** before any query or lamp is active, the results region shows an idle hint rather than an unfiltered grid — for a registry too large to browse, query and status are the only ways in.
- **Table:** a dense list-as-grid (status lamp, cédula in B612 with tabular-nums, nombre, categoría, credencial más crítica, días restantes right-aligned in B612 Mono), rows sorted by días restantes, most urgent first, whenever a filter is active.
- **Chrome persistence:** breadcrumb, title, primary action, and toolbar render in every status including `loading` and `error` (the toolbar may render disabled rather than disappear); the summary renders in every status except `error`, since there is nothing to summarize when the data failed to load.

### Status Lamp + Badge
Never color alone: every lamp pairs its hue/outline treatment with an icon and a text label (StatusBadge always renders both). Bloqueada is the only lamp with a background pattern (the diagonal hatch); Activa and the no-data state are outline-only with no fill, distinguished by icon presence (check vs. none) so "no data yet" is never mistaken for "in order."

### Skeleton
A single pulsing block atom (`--surface-raised` fill, `--r-1` radius, 1.6s ease-in-out opacity pulse, reduced-motion safe): callers size it via their own class for an avatar box, a text-line bar, or a page-key block. Purely decorative (`aria-hidden`); pair it with a visually-hidden `role="status"` text for the loading announcement.

## Do's and Don'ts

### Do:
- **Do** keep every surface, text, and border color on the single `--n-0`…`--n-10` ramp; remap only the semantic assignment between day and night, never the ramp values themselves.
- **Do** reserve B612 Mono for column-aligned figures (table cells, pagination) and discrete counters (the annunciator's totals); use B612 with `tabular-nums` for standalone inline numbers (cédula headline, audit timestamps, badge details).
- **Do** pair every status indicator with a lamp, an icon, and a text label — never color alone.
- **Do** keep the primary button contextual to what the current role and state actually allow; disable it in place rather than hiding or reassigning it when an action is blocked.
- **Do** keep corners at 2px or square, and reserve the diagonal hatch pattern for the Bloqueada state only.
- **Do** use the lookup-console grammar (breadcrumb + title + single primary action, full-width query field, annunciator panel, idle hint, dense table with responsive column drops) for list-style pages; it is a sibling to the Expediente's warning stack, not a KPI-card dashboard.
- **Do** keep list-page chrome (breadcrumb, title, primary action, toolbar) present and reachable in `loading` and `error` states so the page never reflows on resolve.

### Don't:
- **Don't** introduce a shadow anywhere but the confirm dialog's backdrop scrim, or a glow of any kind — depth comes from ramp contrast and hairline rules.
- **Don't** add a second hue-bearing UI element (a colored border stripe, a tinted card, a brand accent color) outside the three status lamp colors.
- **Don't** invent kickers, eyebrows, or card/KPI layouts for new surfaces — the system's page-level grammar is the warning stack, the page keys, or the list console, not a dashboard-card default.
- **Don't** style a second element with the ramp-inverted "primary" fill on the same view; it marks exactly one active/primary target (button, nav item, page key, or annunciator key) at a time.
