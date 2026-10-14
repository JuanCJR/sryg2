# Reports And Audit Specification

## Purpose

Reportes (9) and Visor de auditoría (10) give the directive statistical/compliance visibility and an immutable operations log. Both are `ListPageTemplate` pages with role-dependent access and export actions whose exact format is still open (OD-10).

## Requirements

### Requirement: Reports Cover The V1 Scope With Role-Dependent Access

The system MUST render a Reportes page on `ListPageTemplate`, running v1 reports (personnel with near-expiry/expired credentials, and a real-time consolidated status report), filterable by date range, credential type, and personnel category. Administrador and Supervisor MUST be able to run and export reports; Consulta MUST have limited read access only, per the inventory's role column ("C limitado").

#### Scenario: Administrador runs and exports a report

- GIVEN an Administrador opens Reportes
- WHEN they run the near-expiry/expired report and choose export
- THEN the report data is shown and an export action is available

#### Scenario: Consulta has limited read access

- GIVEN a Consulta-role user opens Reportes
- WHEN the page renders
- THEN they see a report view restricted to their read access
- AND they do not see an export action reserved for Administrador/Supervisor (per the pending OD-10 export scope)

#### Scenario: Reports covers its required states

- GIVEN the Reportes page
- WHEN it is exercised end to end
- THEN it renders empty (no matching records), loading, error, and success states

### Requirement: Report Export Format Is Pending OD-10

The exact export format (CSV, PDF, other) for reports is not decided by this spec (OD-10 is open). The system MUST expose an export action whose concrete output format is a mocked placeholder until OD-10 resolves, and MUST NOT hardcode a specific final format as a requirement here.

#### Scenario: Export action exists without a committed format

- GIVEN OD-10 has not resolved
- WHEN a user triggers export from Reportes
- THEN the export action completes with a mocked placeholder output
- AND no requirement in this change locks in a specific file format

### Requirement: Audit Trail Viewer Is Read-Only And Restricted

The system MUST render a Visor de auditoría page on `ListPageTemplate`, accessible to Administrador and Supervisor only (Consulta has no access, per the inventory and `audit:view` in `permissions.ts`), showing actor, action, entity, and timestamp per row, filterable by actor, date range, entity type, and action.

#### Scenario: Consulta cannot reach the audit viewer

- GIVEN a Consulta-role user attempts to navigate to `/auditoria`
- WHEN the route resolves
- THEN `RequirePermission` renders the `ErrorTemplate` 403 instead of the audit content

#### Scenario: Filtering the audit trail

- GIVEN the audit viewer shows entries from multiple actors
- WHEN a user filters by a specific actor
- THEN only that actor's entries remain visible

#### Scenario: Audit viewer covers its required states

- GIVEN the audit viewer
- WHEN it is exercised end to end
- THEN it renders empty, loading, error, and success states

### Requirement: Per-Person Audit History Lives Inside The Expediente

The per-person audit log (using `AuditLogTable`) MUST be surfaced inside the Expediente's historial tab, not as a separate page, per the inventory's "what is not a page" list.

#### Scenario: A person's audit history appears in their Expediente

- GIVEN a person has recorded audit events
- WHEN a user opens their Expediente's historial tab
- THEN their audit history is listed there via `AuditLogTable`
- AND it is filterable by date range and entity type within that tab
