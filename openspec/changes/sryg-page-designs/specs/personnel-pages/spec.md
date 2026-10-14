# Personnel Pages Specification

## Purpose

Three pages cover the personnel domain: Listado / búsqueda (3), Expediente (4, migrated onto the extracted `DetailPageTemplate`), and Registro / edición (5). Their content follows `design-brief-runbook.md` §6, and the Expediente migration MUST NOT regress the existing, already-reviewed implementation.

## Requirements

### Requirement: Personnel List Supports Search And Role-Dependent Actions

The system MUST render a Listado page on `ListPageTemplate`, accessible to all roles, showing name, cédula, category, and current credential-status summary per row, filterable by name, cédula, category, and credential status. Administrador and Supervisor MUST additionally see a "new personnel" action; Consulta MUST NOT see it.

#### Scenario: Consulta sees the list without a create action

- GIVEN a Consulta-role user opens Listado
- WHEN the page renders
- THEN the table shows name, cédula, category, and status per row
- AND no "new personnel" action is visible

#### Scenario: Administrador sees the create action

- GIVEN an Administrador-role user opens Listado
- WHEN the page renders
- THEN a "new personnel" action is visible and navigates to Registro (page 5)

#### Scenario: Filtering narrows the result set

- GIVEN the Listado page with multiple personnel records
- WHEN a user filters by credential status "Bloqueada"
- THEN only rows with that status remain visible

#### Scenario: List covers its required states

- GIVEN the Listado page
- WHEN it is exercised end to end
- THEN it renders empty (no results), loading, error, and success states; no explicit warning state is required at list level per runbook §6

### Requirement: Expediente Renders Through DetailPageTemplate Without Regression

`ExpedienteContainer` MUST compose the extracted `DetailPageTemplate` instead of its prior bespoke layout. The migration MUST preserve, unchanged: all existing tab content (datos, licencias, habilitaciones, certificados médicos, bloqueos, historial), the persistent blocked-state banner visible across every tab, panel copy, ARIA roles, focus order, and URL behavior (route params, deep-linkable tabs).

#### Scenario: Post-migration capture matches the pre-migration baseline

- GIVEN a fresh baseline capture of the Expediente from `main` at desktop, tablet, and mobile viewports, in both themes, across the states set (tabs, blocked banner, resolve dialog, loading, error, Consulta role, drawer)
- WHEN the same viewports/themes/states are captured after the migration
- THEN each post-migration capture is visually equivalent to its baseline counterpart
- AND any difference is either explained and accepted by the user or treated as a defect to fix before the migration commit lands

#### Scenario: Blocked banner remains persistent across tabs after migration

- GIVEN a person with an active block
- WHEN a user switches between tabs on the migrated Expediente
- THEN the blocked-state banner remains visible on every tab, exactly as before the migration

#### Scenario: Consulta retains read-only access after migration

- GIVEN a Consulta-role user opens the migrated Expediente
- WHEN they view any tab
- THEN they can read all tab content
- AND they cannot reach edit/issue/register actions, consistent with pre-migration access

#### Scenario: Extraction and migration are separable

- GIVEN the `DetailPageTemplate` extraction and the `ExpedienteContainer` migration are committed separately
- WHEN the migration commit alone is reverted
- THEN `ExpedienteContainer` returns to its pre-migration bespoke layout
- AND the extracted `DetailPageTemplate` remains available, unused and harmless

### Requirement: Registro / Edición Creates And Updates Personnel Records

The system MUST render a Registro/edición page on `FormPageTemplate`, accessible only to Administrador and Supervisor (Consulta has no access), that creates a new `PersonalAeronautico` record or edits an existing one with the form pre-filled.

#### Scenario: Consulta cannot reach Registro

- GIVEN a Consulta-role user
- WHEN they attempt to navigate to the Registro route
- THEN they see the `ErrorTemplate` 403 rendered by `RequirePermission`

#### Scenario: Edit mode pre-fills existing data

- GIVEN an Administrador opens Registro for an existing person
- WHEN the page loads
- THEN all fields are pre-filled with that person's current data, including their photo if present

#### Scenario: Save and cancel behave as expected

- GIVEN a Supervisor fills out the create form
- WHEN they submit valid data
- THEN the success state confirms the record was saved (mocked)
- AND choosing cancel instead discards the in-progress form and returns to the previous screen

#### Scenario: Validation failure surfaces field-level errors

- GIVEN a required field is left empty
- WHEN the user submits the form
- THEN the error state shows inline field-level validation errors
- AND the form is not submitted

#### Scenario: Photo upload has a fallback

- GIVEN a person record with no photo
- WHEN Registro or Expediente displays their identity
- THEN a fallback silhouette avatar is shown
- AND the upload/replace-photo action accepts a URL/reference without depending on a specific storage implementation (OD-03 remains open)
