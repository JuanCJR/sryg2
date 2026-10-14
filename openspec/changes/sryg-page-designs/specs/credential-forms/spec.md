# Credential Forms Specification

## Purpose

Two forms issue or renew safety credentials: license/rating issue-renew (6) and medical certificate register/renew (7). Both run the automatic block check as a first-class "blocked" state, not an error, and the medical form must never carry clinical content.

## Requirements

### Requirement: License Issue/Renew Runs The Block Check Before Submission

The system MUST render an Emisión/renovación de licencia page on `FormPageTemplate`, accessible to Administrador and Supervisor, showing license category, dates, current status, and the block-check result for the person the form acts on (reached from their Expediente). WHEN the block check fails, the submit action MUST be disabled and the specific impediment MUST be shown in its place.

#### Scenario: Block check passes and submission proceeds

- GIVEN a person with no active block
- WHEN an Administrador submits a license issue/renew
- THEN the block-check result shows clear
- AND the submit action is enabled and succeeds (mocked), showing the success state

#### Scenario: Block check fails and submission is disabled

- GIVEN a person with an active block
- WHEN a Supervisor opens the license issue/renew form for that person
- THEN the block-check result names the specific impediment
- AND the submit action is disabled, with the blocked state shown via `AlertBanner`, not as a generic error

#### Scenario: License form covers its required states

- GIVEN the license issue/renew form
- WHEN it is exercised end to end
- THEN it renders loading, error, success, and blocked states per runbook §6

### Requirement: Medical Certificate Form Excludes All Clinical Content

The system MUST render a Certificado médico page on `FormPageTemplate` showing RAV 67 class, issue date, expiry date, and general operational restrictions only. The form MUST NOT include a diagnosis, medical history, or any free-text clinical field, per the explicit source guidance in runbook §6.

#### Scenario: The form has no clinical fields

- GIVEN the medical certificate form
- WHEN its fields are enumerated
- THEN only RAV 67 class, issue date, expiry date, and general restrictions are present
- AND no field accepts free-text diagnosis or clinical history

#### Scenario: The no-clinical-data notice is persistent

- GIVEN the medical certificate form is open
- WHEN the user interacts with any part of the form
- THEN the "no clinical data" notice remains visible and is not dismissible

#### Scenario: Medical form applies the same blocked-state pattern

- GIVEN a person with an active block relevant to medical certification
- WHEN the form's block check runs
- THEN the blocked state is shown the same way as in the license form (first-class, not an error)

### Requirement: Medical Certificate Write Access Follows The Role Matrix

Per the inventory's role column, only Administrador MUST be able to submit the medical certificate form. The system MUST gate write access accordingly, and MUST NOT invent read-only or no-access behavior for Supervisor/Consulta beyond what `permissions.ts` (`medical:write`) already encodes.

#### Scenario: A non-Administrador role cannot submit

- GIVEN a Supervisor or Consulta role opens the medical certificate route
- WHEN they attempt to submit
- THEN the action is blocked consistent with the existing `medical:write` grant (Administrador only) in `permissions.ts`

### Requirement: License And Medical History Live Inside The Expediente

Per-license and per-certificate history (LIC-06, MED-07) MUST be surfaced inside the Expediente's relevant tab, not as separate pages or routes. This spec does not add a "licenses" or "medical certificates" list page.

#### Scenario: License history appears in the Expediente

- GIVEN a person has multiple past license issue/renew events
- WHEN a user opens their Expediente's licencias (or historial) tab
- THEN the history is listed there
- AND no separate route exists for license history
