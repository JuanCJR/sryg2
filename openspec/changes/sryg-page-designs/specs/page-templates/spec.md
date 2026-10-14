# Page Templates Specification

## Purpose

Six reusable template components are the only sanctioned structure for any SRYG page. A page is an instance of exactly one template; no page invents its own top-level layout. This spec defines the templates that must exist, the human direction-choice gate that governs new templates, and the composition discipline that keeps sibling pages consistent.

## Requirements

### Requirement: Six Template Components Exist

The system MUST provide six template components under `src/app/templates/`: `DetailPageTemplate`, `ListPageTemplate`, `FormPageTemplate`, `DashboardTemplate`, `AuthTemplate`, and `ErrorTemplate`. Each template MUST expose a documented slot/prop contract (header, content area, actions, and any template-specific regions) that a page composes without redefining layout.

#### Scenario: All six templates are importable

- GIVEN the change is complete
- WHEN a developer imports from `src/app/templates/`
- THEN `DetailPageTemplate`, `ListPageTemplate`, `FormPageTemplate`, `DashboardTemplate`, `AuthTemplate`, and `ErrorTemplate` all resolve to real components (not `PendingScreen`)

#### Scenario: A template exposes a slot contract

- GIVEN a template component such as `ListPageTemplate`
- WHEN a page composes it
- THEN the page supplies content only through the template's documented props/slots (e.g., header, filters, table area, actions)
- AND the page does not define its own top-level page layout outside those slots

### Requirement: Direction Choice Gate For New Templates

For each of `ListPageTemplate`, `FormPageTemplate`, `DashboardTemplate`, and `AuthTemplate`, the system MUST NOT proceed to implement the template until Impeccable has presented three distinct structures for the template's reference page and the user has explicitly chosen one (or steered/re-rolled) via `plain`, `safer`, `bolder`, or canon. The executor MUST NOT pick, default, or infer a direction on the user's behalf.

#### Scenario: Template build is blocked pending a choice

- GIVEN `ListPageTemplate` has no recorded direction in `.impeccable/surfaces/`
- WHEN the slice for `ListPageTemplate` starts
- THEN Impeccable presents three structures for the reference page (Listado de personal)
- AND no template code is written until the user selects one of the three or an explicit steer/re-roll

#### Scenario: Chosen direction is recorded before the template is built

- GIVEN the user selects a structure for `FormPageTemplate`
- WHEN the choice is confirmed
- THEN the choice is recorded in `.impeccable/surfaces/<target>.md`
- AND the `FormPageTemplate` component and its reference page (Emisión de licencia) are built to match the recorded direction

### Requirement: DetailPageTemplate And ErrorTemplate Have No Choice Gate

`DetailPageTemplate` MUST be extracted from the existing, already-reviewed Expediente implementation and its recorded surface brief; it MUST NOT go through the three-structure choice flow. `ErrorTemplate` already exists and MUST be aligned to the `AuthTemplate` structure once `AuthTemplate`'s direction is chosen, without a separate choice gate.

#### Scenario: DetailPageTemplate extraction skips the choice flow

- GIVEN the Expediente's direction is already committed in `.impeccable/surfaces/`
- WHEN `DetailPageTemplate` is extracted
- THEN Impeccable does not present three structures for it
- AND the extracted template preserves the Expediente's existing header, persistent banner, tab set, panel area, action area, and tablet layout

#### Scenario: ErrorTemplate inherits AuthTemplate's structure

- GIVEN `AuthTemplate`'s direction has been chosen
- WHEN `ErrorTemplate` is aligned
- THEN its structure (layout, spacing, typography treatment) follows `AuthTemplate`
- AND its existing props and call sites (404, 403 via `RequirePermission`) continue to work unchanged

### Requirement: Sibling Pages Compose The Chosen Template

Once a template's direction is recorded, every page that instances that template MUST compose it (import and configure) rather than reimplementing its structure. Impeccable treats such a page as an extension: it resolves only content, hierarchy, and states for that page, and does not propose new structures.

#### Scenario: A sibling page reuses the recorded direction

- GIVEN `ListPageTemplate`'s direction was chosen while building "Listado de personal"
- WHEN "Reportes" (also a `ListPageTemplate` page) is built
- THEN Impeccable resolves only Reportes' content, filters, and states
- AND no new structure choice is presented for Reportes

#### Scenario: A missing component is added at the correct layer

- GIVEN a page needs a UI piece that does not exist yet (atom, molecule, or organism)
- WHEN the page is built
- THEN the missing piece is created in `src/design-system/` at its correct atomic level
- AND it is not implemented as page-local inline styles or a one-off component

### Requirement: Template Extension Discipline

When a sibling page's requirements exceed what its template's current props/slots support, the template MUST be extended (new optional prop or slot) rather than bypassed with page-local layout overrides.

#### Scenario: A sibling page needs an extra slot

- GIVEN a page instancing `FormPageTemplate` needs a persistent non-dismissible notice area that the current template does not expose
- WHEN the page is built
- THEN `FormPageTemplate` gains a new optional slot/prop for that notice
- AND existing pages using `FormPageTemplate` continue to render unchanged without supplying the new prop
