# App Routing Specification

## Purpose

Every page in the inventory has exactly one route, reachable at the URL the inventory assigns it, gated by the permission the current demo role matrix requires. `PendingScreen` is a placeholder that must disappear route by route as each page ships, and the router must never protect a route with a permission that `src/app/role/permissions.ts` does not encode.

## Requirements

### Requirement: Built Pages Replace PendingScreen Routes

For each inventory page whose slice is complete, the system MUST replace its `PendingScreen` route in `src/app/App.tsx` with the real page component. A route MUST render `PendingScreen` only for pages whose slice has not yet landed.

#### Scenario: A shipped page's route no longer renders PendingScreen

- GIVEN the "Listado de personal" slice (page 3) is complete
- WHEN a user navigates to `/personal`
- THEN the route renders the real `ListPageTemplate`-based Listado page
- AND it does not render `PendingScreen`

#### Scenario: An unshipped page still renders PendingScreen

- GIVEN a later-wave page's slice has not landed yet
- WHEN a user navigates to that page's route
- THEN the route still renders `PendingScreen` naming the planned change
- AND no broken or blank route exists in its place

### Requirement: New Routes Are Added For Pages Without One

The system MUST add a route for each inventory page that currently has no route at all: Login (1), Registro/edición de personal (5), Emisión/renovación de licencia (6), Certificado médico (7), and Bloqueos (8).

#### Scenario: Login gets a route

- GIVEN Login (page 1) has no route today
- WHEN its slice lands
- THEN `/login` (or the equivalent path chosen for it) resolves to the Login page
- AND the route exists in `src/app/App.tsx`

### Requirement: Login Renders Outside AppShell

The Login page MUST render outside the `AppShell` layout (no top strip, nav rail/drawer, or role-gated chrome), since it is the pre-authentication entry point.

#### Scenario: Login has no shell chrome

- GIVEN a user navigates to the Login route
- WHEN the page renders
- THEN no `AppShell` navigation, top strip, or role menu is present
- AND the page is its own top-level route, not nested under the `AppShell` route element

### Requirement: Permission Gating Uses RequirePermission And The Existing Matrix

Every route for a page whose inventory role column excludes at least one role MUST be wrapped in `RequirePermission` with the permission from `src/app/role/permissions.ts` that matches that page's access rule. The system MUST NOT introduce a new permission that duplicates or contradicts an existing one without updating `permissions.ts` in the same slice.

#### Scenario: A role-restricted route is gated

- GIVEN "Usuarios y roles" (page 11) is Administrador-only per the inventory
- WHEN its route is added
- THEN it is wrapped in `<RequirePermission permission="users:admin">`
- AND a Consulta or Supervisor role sees the `ErrorTemplate` 403 rendered by `RequirePermission`, not the page content

#### Scenario: An all-roles route is not gated

- GIVEN "Dashboard / Alertas" (page 2) is accessible to all roles (content differs per role, per runbook §6)
- WHEN its route is added
- THEN it is not wrapped in `RequirePermission`
- AND role-dependent content differences are handled inside the page, not at the route

### Requirement: No Inventory Route Is Left Unrouted Or Blank

Every one of the inventory pages that is in scope for this change (14, or 15 if Q1 resolves to keep Respaldos) MUST resolve to a route that renders either its real page or `PendingScreen`; no route MUST 404 or render a blank screen for an in-scope page.

#### Scenario: An in-scope page always resolves

- GIVEN any in-scope inventory page and its assigned path
- WHEN a user navigates to that path at any point during the change
- THEN the route renders either the shipped page or `PendingScreen`
- AND never a 404 or blank screen

### Requirement: PendingScreen Retirement Is Deferred To Its Last Usage

The system MUST NOT delete `PendingScreen` while any route still references it. `PendingScreen` MUST be removed only in the slice that replaces its last remaining usage.

#### Scenario: PendingScreen survives mid-chain

- GIVEN some routes still use `PendingScreen` and others have already replaced it
- WHEN any individual page slice lands
- THEN `PendingScreen` remains in `src/app/templates/` and continues to serve the still-pending routes

### Requirement: Root Route Default Is Pending Q5

The root path (`/`) currently redirects to the demo Expediente (`/personal/:DEMO_PERSON_ID`). Whether the root redirect changes to the Dashboard (`/panel`) once the Dashboard exists is an open product decision (Q5) and is NOT decided by this spec.

#### Scenario: Root redirect is unresolved pending Q5

- GIVEN the Dashboard slice (page 2) has landed
- WHEN Q5 has not yet been answered by the user
- THEN the root route continues to redirect to the Expediente as it does today
- AND changing it to redirect to `/panel` requires an explicit user decision recorded before that change is made

### Requirement: Nav Items Reflect Shipped Top-Level Pages

`src/app/shell/nav-items.ts` MUST gain an entry for each newly shipped top-level page that needs shell navigation (at minimum, Bloqueos), consistent with the role gating applied to its route.

#### Scenario: A new top-level page appears in navigation

- GIVEN the Bloqueos page (8) ships with a route gated the same as its `RequirePermission` wrapper
- WHEN a role that can access it is signed in
- THEN a corresponding entry appears in the nav rail/drawer
- AND a role without access does not see the entry (or sees it disabled, per existing nav-gating convention)
