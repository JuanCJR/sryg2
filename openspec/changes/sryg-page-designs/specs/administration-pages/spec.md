# Administration Pages Specification

## Purpose

Three Administrador-only pages cover system administration: Usuarios y roles (11), Parámetros (12), and the conditional Respaldos (13). Two open questions (Q1 for Respaldos, Q4 for Parámetros) are explicitly left unresolved here.

## Requirements

### Requirement: User And Role Administration Is Administrador-Only

The system MUST render a Usuarios y roles page on `ListPageTemplate`, gated by `RequirePermission permission="users:admin"`, showing user list with role, status (active/deactivated), and last login per row, filterable by role and by status.

#### Scenario: Non-Administrador roles cannot reach the page

- GIVEN a Supervisor or Consulta role navigates to `/usuarios`
- WHEN the route resolves
- THEN `RequirePermission` renders the `ErrorTemplate` 403

#### Scenario: Administrador manages users

- GIVEN an Administrador opens Usuarios y roles
- WHEN they create a user, edit a role, or reset a password
- THEN the corresponding action completes (mocked) and the list reflects the change

#### Scenario: Deactivating a user requires destructive confirmation

- GIVEN an active user account
- WHEN an Administrador chooses to deactivate it
- THEN a confirmation dialog names the specific consequence in plain language and requires type-to-confirm, per runbook §7's highest-consequence destructive pattern
- AND the account is not deactivated until that confirmation completes

#### Scenario: Usuarios y roles covers its required states

- GIVEN the page
- WHEN it is exercised end to end
- THEN it renders empty, loading, error, and success states

### Requirement: Parámetros Configures System-Wide Values, Administrador-Only

The system MUST render a Parámetros page on `FormPageTemplate`, gated by `RequirePermission permission="settings:admin"`, showing current values for license validity, medical validity, alert threshold, and notification channel, with an action to edit and save each parameter, confirming on success.

#### Scenario: Non-Administrador roles cannot reach Parámetros

- GIVEN a Supervisor or Consulta role navigates to `/parametros`
- WHEN the route resolves
- THEN `RequirePermission` renders the `ErrorTemplate` 403

#### Scenario: Saving a parameter shows a confirmation

- GIVEN an Administrador edits the alert threshold value
- WHEN they save it
- THEN the success state confirms the value changed

#### Scenario: Parámetros covers its required states

- GIVEN the page
- WHEN it is exercised end to end
- THEN it renders loading, error, and success states

### Requirement: Parámetros Grouping Is Pending Q4

Whether Parámetros is a single page grouping all parameters by category, or a set of per-module settings pages, is not decided by this spec (Q4 is open). Pending Q4, the system SHOULD implement the runbook's proposed default — one page grouping parameters by category (license validity, medical validity, alert threshold, notification channel) — and MAY be restructured into per-module pages if Q4 resolves otherwise.

#### Scenario: Default grouped layout ships pending Q4

- GIVEN Q4 has not been answered when the Parámetros slice is built
- WHEN the page ships
- THEN all four parameter categories appear grouped on the single Parámetros page
- AND no per-module settings pages are created ahead of that decision

#### Scenario: Q4 resolves to per-module pages

- GIVEN Q4 is later answered in favor of per-module settings
- WHEN that decision is implemented
- THEN the grouped Parámetros page is split into per-module pages in a subsequent, explicitly scoped slice

### Requirement: Respaldos Existence And Content Are Pending Q1

Whether page 13 (Respaldos) is built at all, or replaced by an operations runbook (OPS-04), is not decided by this spec (Q1 is open). IF Q1 resolves to build it, the system MUST render a Respaldos page on `DashboardTemplate` (small panel), gated by `RequirePermission permission="backups:view"`, showing last backup timestamp, status (success/failure), and size, with an optional manual-backup trigger and a link to restore instructions. IF Q1 resolves to drop it, the system MUST remove the `/respaldos` route and its nav entry rather than leaving a dead `PendingScreen` route indefinitely.

#### Scenario: Q1 resolves to build the page

- GIVEN Q1 is answered in favor of building Respaldos
- WHEN the S15 slice is built
- THEN `/respaldos` renders the real `DashboardTemplate`-based page with backup status data
- AND the manual-backup trigger and restore-instructions link are present per runbook §6

#### Scenario: Q1 resolves to drop the page

- GIVEN Q1 is answered in favor of an operations runbook instead
- WHEN that decision is implemented
- THEN the `/respaldos` route and its nav item are removed
- AND `PendingScreen`'s last reference for this route is retired in that same slice

#### Scenario: Respaldos stays pending until Q1 answers

- GIVEN Q1 is unanswered
- WHEN all other slices in this change complete
- THEN `/respaldos` continues to render `PendingScreen` naming `sryg-backups-ops`
- AND no other slice is blocked by this pending state
