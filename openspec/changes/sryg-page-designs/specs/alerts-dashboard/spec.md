# Alerts Dashboard Specification

## Purpose

The Dashboard / Alertas page (2) is the single landing surface for expiry alerts and system status. Content depends on role. Alert acknowledgement (ALR-06) lives inside this page rather than as its own route, per the inventory's "what is not a page" list.

## Requirements

### Requirement: Dashboard Shows Role-Dependent Alert And Status Content

The system MUST render a Dashboard page on `DashboardTemplate`, accessible to all roles, showing near-expiry and expired credential counts and recent blocks for every role. Administrador and Supervisor MUST additionally see recent audit activity; Consulta MUST NOT see the audit section and MUST see only the content their read access permits.

#### Scenario: Administrador sees the full dashboard

- GIVEN an Administrador-role user opens the Dashboard
- WHEN the page renders
- THEN near-expiry/expired counts, recent blocks, and recent audit activity are all visible

#### Scenario: Consulta sees a restricted dashboard

- GIVEN a Consulta-role user opens the Dashboard
- WHEN the page renders
- THEN near-expiry/expired counts and recent blocks appropriate to their read access are visible
- AND no recent-audit-activity section is rendered

### Requirement: Dashboard Alerts Support Filtering And Drill-Through

The system MUST let a user filter alerts by credential type and by near-expiry vs. expired, and clicking through an alert or count MUST navigate to the corresponding filtered personnel list or report.

#### Scenario: Filtering by near-expiry narrows the alert list

- GIVEN the Dashboard shows both near-expiry and expired alerts
- WHEN a user filters to near-expiry only
- THEN only near-expiry alerts remain visible

#### Scenario: Clicking an alert count opens the filtered list

- GIVEN the Dashboard shows an expired-credentials count
- WHEN a user clicks it
- THEN the app navigates to the personnel list pre-filtered to expired credentials

### Requirement: Alert Acknowledgement Lives On The Dashboard

The system MUST provide an alert-acknowledgement action (ALR-06) on the Dashboard page itself. This action MUST NOT be implemented as a separate route or page.

#### Scenario: A user acknowledges an alert from the dashboard

- GIVEN an open alert is visible on the Dashboard
- WHEN a user with the appropriate role acknowledges it
- THEN the alert is marked acknowledged in the mock data
- AND no separate acknowledgement page or route exists

### Requirement: Dashboard Covers Its Required States

The Dashboard MUST render empty (no open alerts), loading, error (data fetch failed), success, and warning (blocked credentials present) states, using `AlertBanner`, `DashboardAlertList`, and `StatusBadge` per runbook §6.

#### Scenario: Dashboard shows the warning state when blocks are present

- GIVEN at least one personnel record has an active block
- WHEN the Dashboard loads
- THEN the warning state is rendered alongside the relevant alert content

#### Scenario: Dashboard shows the empty state

- GIVEN no open alerts exist in the mock data
- WHEN the Dashboard loads
- THEN the empty state is rendered instead of an empty list with no explanation

### Requirement: Root Redirect To The Dashboard Is Pending Q5

Whether the app's root route (`/`) redirects to the Dashboard once it exists, instead of the current demo Expediente, is an open product decision (Q5) and is NOT decided by this spec. See `app-routing` capability, "Root Route Default Is Pending Q5".

#### Scenario: Dashboard ships without changing the root redirect

- GIVEN the Dashboard slice lands and Q5 is still unanswered
- WHEN a user navigates to `/`
- THEN the root route continues to redirect exactly as it did before this slice
